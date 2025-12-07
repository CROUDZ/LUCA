import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashToken } from "@/lib/auth/emailVerification";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, email } = body as { token?: string; email?: string };

    if (!token || !email) {
      return NextResponse.json({ error: "Token ou email manquant" }, { status: 400 });
    }

    const hashedToken = hashToken(token);
    const now = new Date();

    const verificationEntry = await prisma.verificationToken.findFirst({
      where: {
        identifier: email.toLowerCase(),
        token: hashedToken,
        expires: { gt: now },
      },
    });

    if (!verificationEntry) {
      return NextResponse.json({ error: "Token invalide ou expiré" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { email: verificationEntry.identifier },
      data: { verified: true, emailVerified: new Date() },
      select: { id: true, email: true, name: true, verified: true },
    });

    await prisma.verificationToken.deleteMany({ where: { identifier: verificationEntry.identifier } });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Erreur vérification email:", error);
    return NextResponse.json({ error: "Impossible de vérifier l'email" }, { status: 500 });
  }
}
