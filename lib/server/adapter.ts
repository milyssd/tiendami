import { PrismaMariaDb } from '@prisma/adapter-mariadb';
export function databaseAdapter() {
  const url = new URL(process.env.DATABASE_URL!);
  if (!['mysql:', 'mariadb:'].includes(url.protocol))
    throw new Error('DATABASE_URL must use mysql or mariadb');
  return new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    connectionLimit: 8,
    allowPublicKeyRetrieval: ['localhost', '127.0.0.1', '::1'].includes(
      url.hostname,
    ),
    ...(url.searchParams.get('ssl') === 'true'
      ? { ssl: { rejectUnauthorized: true } }
      : {}),
  });
}
