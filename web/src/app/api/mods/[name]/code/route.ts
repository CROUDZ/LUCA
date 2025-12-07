import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface Params {
  params: Promise<{ name: string }>;
}

/**
 * GET /api/mods/[name]/code - Voir le code source d'un mod
 * Accessible pour la vérification par les modérateurs
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { name } = await params;

    const mod = await prisma.mod.findUnique({
      where: { name },
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        version: true,
        mainCode: true,
        nodeTypes: true,
        manifest: true,
        permissions: true,
        category: true,
        status: true,
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
      },
    });

    if (!mod) {
      return NextResponse.json(
        { error: 'Mod not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...mod,
      // Formater le code pour l'affichage
      codeFormatted: mod.mainCode,
    });
  } catch (error) {
    console.error('Error fetching mod code:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mod code' },
      { status: 500 }
    );
  }
}
