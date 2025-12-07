const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  try {
    prisma.$on('query', (e) => {
      console.log('Prisma query:', e.query, e.params, e.duration);
    });
    console.log('Prisma DMMF model User fields:', prisma._dmmf.modelMap.User.fields.map(f => f.name));
    console.log('Prisma client ok. Attempting query...');
    const fields = ['id','name','email','passwordHash','avatarUrl','bio','role','emailVerified','verified','createdAt','updatedAt'];
    for (const f of fields) {
      try {
        const res = await prisma.user.findMany({ select: { [f]: true }, take: 1 });
        console.log(`Field ${f} OK`);
      } catch (e) {
        console.error(`Field ${f} ERROR:`, e.message || e);
      }
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
})();
