import { PrismaClient } from '@prisma/client';
import { databaseAdapter } from './adapter';
const globalDb = globalThis as unknown as { prisma?: PrismaClient };
export function makeDb() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  return new PrismaClient({ adapter: databaseAdapter() });
}
export const db = globalDb.prisma ?? makeDb();
if (process.env.NODE_ENV !== 'production') globalDb.prisma = db;
