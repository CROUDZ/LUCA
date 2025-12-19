import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendModApprovedNotification, sendModRejectedNotification } from '@/lib/discord';

interface Params {
  params: Promise<{ modId: string }>;
}

/**
 * POST /api/mods/moderate/[modId] - Modérer un mod (approuver ou refuser)
 *
 * Body:
 * - action: 'approve' | 'reject'
 * - reason?: string (optionnel, pour le refus)
 * - secret: string (clé secrète pour la modération)
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { modId } = await params;
    const body = await request.json();
    const { action, reason, secret } = body;

    // Vérifier la clé secrète de modération
    const moderationSecret = process.env.MOD_MODERATION_SECRET;
    if (!moderationSecret || secret !== moderationSecret) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid moderation secret' },
        { status: 401 }
      );
    }

    // Valider l'action
    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Récupérer le mod
    const mod = await prisma.mod.findUnique({
      where: { id: modId },
      select: {
        id: true,
        name: true,
        displayName: true,
        status: true,
      },
    });

    if (!mod) {
      return NextResponse.json({ error: 'Mod not found' }, { status: 404 });
    }

    if (action === 'approve') {
      // Approuver le mod
      await prisma.mod.update({
        where: { id: modId },
        data: {
          status: 'APPROVED',
          verified: true,
          publishedAt: new Date(),
        },
      });

      // Envoyer notification Discord
      await sendModApprovedNotification({
        displayName: mod.displayName,
        modName: mod.name,
      });

      return NextResponse.json({
        success: true,
        message: `Mod "${mod.displayName}" has been approved`,
        status: 'APPROVED',
      });
    } else if (action === 'reject') {
      // Envoyer notification avant suppression
      await sendModRejectedNotification({
        displayName: mod.displayName,
        modName: mod.name,
        reason,
      });

      // Supprimer le mod et toutes ses données associées (cascade)
      await prisma.mod.delete({
        where: { id: modId },
      });

      return NextResponse.json({
        success: true,
        message: `Mod "${mod.displayName}" has been rejected and deleted`,
        reason: reason || 'No reason provided',
      });
    }

    return NextResponse.json({ error: 'Unknown error' }, { status: 500 });
  } catch (error) {
    console.error('Error moderating mod:', error);
    return NextResponse.json({ error: 'Failed to moderate mod' }, { status: 500 });
  }
}

/**
 * GET /api/mods/moderate/[modId] - Obtenir le statut de modération d'un mod
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { modId } = await params;

    const mod = await prisma.mod.findUnique({
      where: { id: modId },
      select: {
        id: true,
        name: true,
        displayName: true,
        status: true,
        verified: true,
        rejectionReason: true,
        createdAt: true,
        publishedAt: true,
      },
    });

    if (!mod) {
      return NextResponse.json({ error: 'Mod not found' }, { status: 404 });
    }

    return NextResponse.json(mod);
  } catch (error) {
    console.error('Error fetching mod status:', error);
    return NextResponse.json({ error: 'Failed to fetch mod status' }, { status: 500 });
  }
}
