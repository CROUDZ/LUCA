const { hash } = require('/home/giovanni/Bureau/LUCA/web/node_modules/bcryptjs');
const prisma = require('@prisma/client').PrismaClient ? new (require('@prisma/client').PrismaClient)() : undefined;
const crypto = require('crypto');
function hashToken(token) { return crypto.createHash('sha256').update(token).digest('hex'); }

(async () => {
  try {
    const email = 'simulate-register@example.com';
    const password = 'simulatePass123';
    const name = 'Simulate';
    if (!email || !password) throw new Error('Email and password required');
    const normalizedEmail = email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      console.log('Already exists');
      return;
    }
    const passwordHash = await hash(password, 12);
    const user = await prisma.user.create({
      data: { email: normalizedEmail, passwordHash, name, verified: false, role: 'USER' },
    });
    const token = crypto.randomBytes(32).toString('hex');
    const hashed = hashToken(token);
    const expires = new Date(Date.now() + 24*60*60*1000);
    await prisma.verificationToken.create({ data: { identifier: normalizedEmail, token: hashed, expires } });
    const tokenData = { verificationUrl: `http://localhost:3000/auth/verify?token=${token}&email=${encodeURIComponent(normalizedEmail)}` };
    console.log('Created user and token', user.id, tokenData.verificationUrl);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();
