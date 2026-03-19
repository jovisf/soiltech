import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
// @ts-ignore
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash('password', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@soiltech.com' },
    update: {},
    create: {
      email: 'admin@soiltech.com',
      name: 'Admin',
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });

  console.log('Admin user created:', admin.email);

  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@soiltech.com' },
    update: {},
    create: {
      email: 'viewer@soiltech.com',
      name: 'Viewer',
      password: hashedPassword,
      role: Role.VIEWER,
    },
  });

  console.log('Viewer user created:', viewer.email);

  // Clear existing farms/pivots if they exist to avoid unique constraint issues if any
  await prisma.pivot.deleteMany();
  await prisma.farm.deleteMany();

  const farm = await prisma.farm.create({
    data: {
      name: 'Validation Farm',
      latitude: -23.55,
      longitude: -46.63,
    },
  });

  console.log('Farm created:', farm.id);

  const pivot = await prisma.pivot.create({
    data: {
      farmId: farm.id,
      name: 'Validation Pivot',
      latitude: -23.56,
      longitude: -46.64,
      bladeAt100: 20,
      status: {},
    },
  });

  console.log('Pivot created:', pivot.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
