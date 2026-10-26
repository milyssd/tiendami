import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { databaseAdapter } from '../lib/server/adapter';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const db = new PrismaClient({ adapter: databaseAdapter() });

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@tiendami.com';
  const password = process.env.ADMIN_PASSWORD || 'AdminTiendaMi2026!';
  const passwordHash = await argon2.hash(password);

  const user = await db.user.upsert({
    where: { email: email.toLowerCase() },
    create: {
      email: email.toLowerCase(),
      name: 'Administrador',
      role: 'ADMIN',
      verifiedAt: new Date(),
      passwordHash,
    },
    update: {
      name: 'Administrador',
      role: 'ADMIN',
      verifiedAt: new Date(),
      passwordHash,
      blocked: false,
    },
  });

  console.log(`USUARIO_CREADO: ${user.email} con rol ${user.role}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
