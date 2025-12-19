import crypto from 'crypto';
import prisma from '@/lib/prisma';

const EXPIRATION_HOURS = 24;

export async function createEmailVerificationToken(email: string, origin: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = hashToken(token);
  const expires = new Date(Date.now() + EXPIRATION_HOURS * 60 * 60 * 1000);

  await prisma.verificationToken.deleteMany({ where: { identifier: email } });

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: hashedToken,
      expires,
    },
  });

  const verificationUrl = `${origin}/auth/verify?token=${token}&email=${encodeURIComponent(email)}`;

  return { verificationUrl, expires, token };
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
