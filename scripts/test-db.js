require('dotenv/config');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const connectionString = process.env.DATABASE_URL;
console.log('DATABASE_URL défini:', !!connectionString);

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function testConnection() {
  try {
    const result = await prisma.$queryRaw`SELECT NOW() AS current_time;`;
    console.log("✅ Connexion Prisma réussie !");
    console.log("Heure actuelle du serveur :", result[0].current_time);
  } catch (error) {
    console.error("❌ Erreur de connexion :", error.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

testConnection();
