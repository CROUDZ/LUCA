import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createEmailVerificationToken } from '@/lib/auth/emailVerification';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body as { email?: string };

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      return NextResponse.json({ error: 'Aucun compte associé' }, { status: 404 });
    }

    if (user.verified) {
      return NextResponse.json({ message: 'Compte déjà vérifié' });
    }

    const origin = new URL(request.url).origin;
    const { verificationUrl } = await createEmailVerificationToken(normalizedEmail, origin);

    console.info('Lien de vérification envoyé:', verificationUrl);

    return NextResponse.json({
      success: true,
      message: 'Email de vérification envoyé',
      verificationUrl: process.env.NODE_ENV === 'development' ? verificationUrl : undefined,
    });
  } catch (error) {
    console.error('Erreur envoi vérification:', error);
    return NextResponse.json({ error: "Impossible d'envoyer l'email" }, { status: 500 });
  }
}
