import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import prisma from '@/lib/prisma';
import { createEmailVerificationToken } from '@/lib/auth/emailVerification';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body as { email?: string; password?: string; name?: string };

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe sont requis' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: 'Un compte existe déjà avec cet email' }, { status: 409 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 8 caractères' },
        { status: 400 }
      );
    }

    const passwordHash = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: name || normalizedEmail.split('@')[0],
        verified: false,
        role: 'USER',
      },
      select: { id: true, email: true, name: true },
    });

    const origin = new URL(request.url).origin;
    const { verificationUrl } = await createEmailVerificationToken(normalizedEmail, origin);

    console.log('Lien de vérification envoyé:', verificationUrl);

    return NextResponse.json(
      {
        success: true,
        message: 'Compte créé. Vérifiez vos emails pour activer votre compte.',
        // Utile en développement pour tester sans SMTP
        verificationUrl: process.env.NODE_ENV === 'development' ? verificationUrl : undefined,
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erreur lors de l'inscription:", error);
    return NextResponse.json({ error: 'Impossible de créer le compte' }, { status: 500 });
  }
}
