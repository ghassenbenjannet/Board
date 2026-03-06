import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'demo@board.local';
  const passwordHash = await bcrypt.hash('demo1234', 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: 'Demo User', passwordHash }
  });

  await prisma.board.upsert({
    where: { id: 'demo-board' },
    update: {},
    create: {
      id: 'demo-board',
      name: 'Demo board',
      ownerId: user.id,
      state: { objects: [] }
    }
  });
}

main().finally(() => prisma.$disconnect());
