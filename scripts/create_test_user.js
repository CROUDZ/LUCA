const { PrismaClient } = require('@prisma/client');
const { hash } = require('/home/giovanni/Bureau/LUCA/web/node_modules/bcryptjs');

(async () => {
  const prisma = new PrismaClient();
  try {
    const email = 'api-test@example.com';
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log('Deleting existing user', existing.id);
      await prisma.user.delete({ where: { id: existing.id } });
    }
    const passwordHash = await hash('securePassword123', 12);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: 'API Test',
        verified: false,
        role: 'USER',
      },
      select: { id: true, email: true, name: true, verified: true },
    });
    console.log('Created user', user);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();
