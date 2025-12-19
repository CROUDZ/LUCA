import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface Params {
  params: Promise<{ name: string }>;
}

// GET /api/mods/[name]/download - Télécharger un mod (pour l'app Android)
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { name } = await params;
    const { searchParams } = new URL(request.url);
    const version = searchParams.get('version');
    const platform = searchParams.get('platform') || 'android';

    // Récupérer le mod
    const mod = await prisma.mod.findUnique({
      where: { name },
      select: {
        id: true,
        name: true,
        displayName: true,
        version: true,
        mainCode: true,
        manifest: true,
        nodeTypes: true,
        permissions: true,
        checksum: true,
        status: true,
      },
    });

    if (!mod) {
      return NextResponse.json({ error: 'Mod not found' }, { status: 404 });
    }

    // Vérifier que le mod est approuvé
    if (mod.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Mod is not available for download' }, { status: 403 });
    }

    // Si une version spécifique est demandée
    let mainCode = mod.mainCode;
    let manifest = mod.manifest;
    let checksum = mod.checksum;

    if (version && version !== mod.version) {
      const modVersion = await prisma.modVersion.findUnique({
        where: {
          modId_version: {
            modId: mod.id,
            version,
          },
        },
      });

      if (!modVersion) {
        return NextResponse.json({ error: 'Version not found' }, { status: 404 });
      }

      mainCode = modVersion.mainCode;
      manifest = modVersion.manifest;
      checksum = modVersion.checksum;
    }

    // Enregistrer le téléchargement et incrémenter le compteur
    await Promise.all([
      prisma.mod.update({
        where: { id: mod.id },
        data: { downloads: { increment: 1 } },
      }),
      prisma.modDownload.create({
        data: {
          modId: mod.id,
          version: version || mod.version,
          platform,
        },
      }),
    ]);

    // Retourner le mod complet pour l'app Android
    return NextResponse.json({
      id: mod.id,
      name: mod.name,
      displayName: mod.displayName,
      version: version || mod.version,
      mainCode,
      manifest,
      nodeTypes: mod.nodeTypes,
      permissions: mod.permissions,
      checksum,
    });
  } catch (error) {
    console.error('Error downloading mod:', error);
    return NextResponse.json({ error: 'Failed to download mod' }, { status: 500 });
  }
}
