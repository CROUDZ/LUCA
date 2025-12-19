import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { sendModSubmissionNotification } from '@/lib/discord';
import { auth } from '@/auth';

// GET /api/mods - Liste tous les mods approuvés
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const category = searchParams.get('category');
    const sort = searchParams.get('sort') || 'downloads';
    const order = searchParams.get('order') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || 'APPROVED';

    const skip = (page - 1) * limit;

    // Construire la requête
    const where: Prisma.ModWhereInput = {
      status: status as Prisma.EnumModStatusFilter,
    };

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { displayName: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { tags: { has: query.toLowerCase() } },
      ];
    }

    if (category && category !== 'all') {
      where.category = category;
    }

    // Déterminer l'ordre
    let orderBy: Prisma.ModOrderByWithRelationInput;
    switch (sort) {
      case 'downloads':
        orderBy = { downloads: order as Prisma.SortOrder };
        break;
      case 'rating':
        orderBy = { rating: order as Prisma.SortOrder };
        break;
      case 'updated':
        orderBy = { updatedAt: order as Prisma.SortOrder };
        break;
      case 'name':
        orderBy = { displayName: order as Prisma.SortOrder };
        break;
      default:
        orderBy = { downloads: 'desc' };
    }

    // Récupérer les mods
    const [mods, total] = await Promise.all([
      prisma.mod.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          displayName: true,
          description: true,
          version: true,
          category: true,
          tags: true,
          iconUrl: true,
          downloads: true,
          rating: true,
          reviewCount: true,
          verified: true,
          permissions: true,
          nodeTypes: true,
          createdAt: true,
          updatedAt: true,
          author: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.mod.count({ where }),
    ]);

    return NextResponse.json({
      mods,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching mods:', error);
    return NextResponse.json({ error: 'Failed to fetch mods' }, { status: 500 });
  }
}

// POST /api/mods - Créer un nouveau mod
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!session.user.verified) {
      return NextResponse.json({ error: 'Email verification required' }, { status: 403 });
    }

    const body = await request.json();

    const {
      name,
      displayName,
      description,
      longDescription,
      version,
      mainCode,
      nodeTypes,
      category,
      tags,
      permissions,
      license,
      repositoryUrl,
      authorName,
    } = body;

    // Validation basique
    if (!name || !displayName || !description || !mainCode) {
      return NextResponse.json(
        { error: 'Missing required fields: name, displayName, description, mainCode' },
        { status: 400 }
      );
    }

    // Valider le nom (lowercase, alphanumeric, hyphens)
    if (!/^[a-z0-9-]+$/.test(name)) {
      return NextResponse.json(
        { error: 'Name must be lowercase alphanumeric with hyphens only' },
        { status: 400 }
      );
    }

    // Vérifier si le nom existe déjà
    const existing = await prisma.mod.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: 'A mod with this name already exists' }, { status: 409 });
    }

    const finalAuthorId = session.user.id;
    const finalAuthorName = authorName || session.user.name || session.user.email || 'Anonymous';

    // Calculer le checksum du code
    const checksum = crypto.createHash('sha256').update(mainCode).digest('hex');

    // Construire le manifest
    const manifest = {
      manifest_version: 1,
      name,
      version: version || '1.0.0',
      display_name: displayName,
      description,
      main: 'main.mjs',
      api_version: '1.0.0',
      author: finalAuthorName,
      permissions: permissions || [],
      node_types: nodeTypes || {},
      compatibility: {
        luca_min: '1.0.0',
        platforms: ['android', 'ios', 'web'],
      },
      integrity: {
        hash: `sha256:${checksum}`,
      },
    };

    // Créer le mod
    const mod = await prisma.mod.create({
      data: {
        name,
        displayName,
        description,
        longDescription: longDescription || null,
        version: version || '1.0.0',
        mainCode,
        manifest,
        nodeTypes: nodeTypes || {},
        category: category || 'Other',
        tags: tags || [],
        permissions: permissions || [],
        checksum,
        license: license || 'MIT',
        repositoryUrl: repositoryUrl || null,
        authorId: finalAuthorId,
        status: 'PENDING', // Tous les mods commencent en attente de vérification
        verified: false,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Créer la première version
    await prisma.modVersion.create({
      data: {
        modId: mod.id,
        version: mod.version,
        mainCode,
        manifest,
        checksum,
        changelog: 'Initial release',
      },
    });

    // Envoyer une notification Discord pour la modération
    try {
      await sendModSubmissionNotification({
        modId: mod.id,
        modName: mod.name,
        displayName: mod.displayName,
        description: mod.description,
        version: mod.version,
        authorName: mod.author.name,
        category: mod.category,
        mainCode: mod.mainCode,
      });
    } catch (discordError) {
      // Ne pas bloquer la création si Discord échoue
      console.error('Discord notification failed:', discordError);
    }

    return NextResponse.json(
      {
        success: true,
        mod: {
          id: mod.id,
          name: mod.name,
          version: mod.version,
          status: mod.status,
        },
        message: 'Mod submitted for review. It will be available once approved.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating mod:', error);
    return NextResponse.json({ error: 'Failed to create mod' }, { status: 500 });
  }
}
