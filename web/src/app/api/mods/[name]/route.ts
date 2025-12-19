import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';

interface Params {
  params: Promise<{ name: string }>;
}

// GET /api/mods/[name] - Obtenir un mod par son nom
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { name } = await params;

    const mod = await prisma.mod.findUnique({
      where: { name },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            bio: true,
          },
        },
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            version: true,
            changelog: true,
            createdAt: true,
          },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            reviews: true,
            downloadLogs: true,
          },
        },
      },
    });

    if (!mod) {
      return NextResponse.json({ error: 'Mod not found' }, { status: 404 });
    }

    return NextResponse.json(mod);
  } catch (error) {
    console.error('Error fetching mod:', error);
    return NextResponse.json({ error: 'Failed to fetch mod' }, { status: 500 });
  }
}

// PUT /api/mods/[name] - Mettre à jour un mod
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { name } = await params;
    const body = await request.json();

    const mod = await prisma.mod.findUnique({ where: { name } });

    if (!mod) {
      return NextResponse.json({ error: 'Mod not found' }, { status: 404 });
    }

    // TODO: Vérifier que l'utilisateur est l'auteur

    const {
      displayName,
      description,
      longDescription,
      version,
      mainCode,
      nodeTypes,
      category,
      tags,
      permissions,
      repositoryUrl,
    } = body;

    const updateData: Prisma.ModUpdateInput = {};

    if (displayName) updateData.displayName = displayName;
    if (description) updateData.description = description;
    if (longDescription !== undefined) updateData.longDescription = longDescription;
    if (category) updateData.category = category;
    if (tags) updateData.tags = tags;
    if (permissions) updateData.permissions = permissions;
    if (repositoryUrl !== undefined) updateData.repositoryUrl = repositoryUrl;

    // Si le code change, créer une nouvelle version
    if (mainCode && (version || mainCode !== mod.mainCode)) {
      const newVersion = version || incrementVersion(mod.version);
      const checksum = crypto.createHash('sha256').update(mainCode).digest('hex');

      updateData.version = newVersion;
      updateData.mainCode = mainCode;
      updateData.checksum = checksum;
      updateData.status = 'PENDING'; // Re-review nécessaire

      if (nodeTypes) {
        updateData.nodeTypes = nodeTypes;
      }

      // Mettre à jour le manifest
      const manifest = {
        ...(mod.manifest as object),
        version: newVersion,
        node_types: nodeTypes || mod.nodeTypes,
        integrity: {
          hash: `sha256:${checksum}`,
        },
      };
      updateData.manifest = manifest;

      // Créer la nouvelle version
      await prisma.modVersion.create({
        data: {
          modId: mod.id,
          version: newVersion,
          mainCode,
          manifest,
          checksum,
          changelog: body.changelog || `Version ${newVersion}`,
        },
      });
    }

    const updatedMod = await prisma.mod.update({
      where: { name },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      mod: updatedMod,
    });
  } catch (error) {
    console.error('Error updating mod:', error);
    return NextResponse.json({ error: 'Failed to update mod' }, { status: 500 });
  }
}

// DELETE /api/mods/[name] - Supprimer un mod
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { name } = await params;

    const mod = await prisma.mod.findUnique({ where: { name } });

    if (!mod) {
      return NextResponse.json({ error: 'Mod not found' }, { status: 404 });
    }

    // TODO: Vérifier que l'utilisateur est l'auteur ou admin

    await prisma.mod.delete({ where: { name } });

    return NextResponse.json({
      success: true,
      message: 'Mod deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting mod:', error);
    return NextResponse.json({ error: 'Failed to delete mod' }, { status: 500 });
  }
}

// Helper pour incrémenter la version
function incrementVersion(version: string): string {
  const parts = version.split('.');
  const patch = parseInt(parts[2] || '0') + 1;
  return `${parts[0]}.${parts[1]}.${patch}`;
}
