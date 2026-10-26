import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';
import { db } from './db';
import { hash } from './crypto';
import { HttpError } from './http';
import type { Role } from '@prisma/client';
export const cookieName = 'tm_session';
export async function session() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const s = await db.session.findUnique({
    where: { tokenHash: hash(token) },
    include: { user: true },
  });
  return s && s.expiresAt > new Date() && !s.user.blocked ? s : null;
}
export async function requireUser(
  roles: Role[] = ['CUSTOMER', 'SUPPORT', 'ADMIN'],
) {
  const s = await session();
  if (!s) throw new HttpError(401, 'Inicia sesión para continuar.');
  if (
    roles.length < 3 &&
    s.user.role === 'ADMIN' &&
    (!s.user.totpEnabled || !s.twoFactorVerified)
  )
    throw new HttpError(
      403,
      'Configura el segundo factor en Mi cuenta para administrar la tienda.',
    );
  if (!roles.includes(s.user.role))
    throw new HttpError(403, 'No tienes permiso para esta acción.');
  return s.user;
}
export async function createSession(
  userId: string,
  userAgent: string,
  twoFactorVerified = false,
) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 7 * 86400000);
  await db.session.create({
    data: {
      userId,
      twoFactorVerified,
      tokenHash: hash(token),
      expiresAt,
      userAgent: userAgent.slice(0, 500),
    },
  });
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    secure: process.env.APP_URL?.startsWith('https:') ?? false,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}
