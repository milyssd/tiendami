export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import {
  endpoint,
  sameOrigin,
  limit,
  ipHash,
  HttpError,
} from '@/lib/server/http';
import { db } from '@/lib/server/db';
import { hash } from '@/lib/server/crypto';
import { createSession, requireUser, cookieName } from '@/lib/server/auth';
import { cookies } from 'next/headers';
import { verifySecondFactor } from '@/lib/server/totp';
import { sendEmail } from '@/lib/server/email';
const input = z
  .object({
    action: z.enum([
      'login',
      'register',
      'logout',
      'logout-all',
      'recover',
      'reset',
      'verify',
      'send-verification',
    ]),
    email: z
      .string()
      .email()
      .max(254)
      .transform((s) => s.toLowerCase())
      .optional(),
    password: z.string().min(12).max(128).optional(),
    name: z.string().min(2).max(100).optional(),
    token: z.string().min(20).max(200).optional(),
    otp: z.string().min(6).max(30).optional(),
  })
  .strict();
export const POST = endpoint(async (req) => {
  sameOrigin(req);
  await limit(`auth:${ipHash(req)}`, 20);
  const d = input.parse(await req.json());
  if (d.action === 'logout') {
    const token = (await cookies()).get(cookieName)?.value;
    if (token)
      await db.session.deleteMany({ where: { tokenHash: hash(token) } });
    (await cookies()).delete(cookieName);
    return NextResponse.json({ ok: true });
  }
  if (d.action === 'logout-all') {
    const u = await requireUser();
    await db.session.deleteMany({ where: { userId: u.id } });
    (await cookies()).delete(cookieName);
    return NextResponse.json({ ok: true });
  }
  if (d.action === 'send-verification') {
    const u = await requireUser();
    await limit(`verify:${u.id}`, 3, 60);
    if (u.verifiedAt) return NextResponse.json({ ok: true });
    if (!process.env.SMTP_HOST)
      throw new HttpError(
        503,
        'El correo de verificación aún no está configurado.',
      );
    const token = randomBytes(32).toString('base64url');
    await db.authToken.create({
      data: {
        userId: u.id,
        tokenHash: hash(token),
        kind: 'VERIFY',
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    await sendEmail(
      u.email,
      'Verifica tu correo en TiendaMi',
      `${process.env.APP_URL}/cuenta?verify=${token}`,
    );
    return NextResponse.json({ ok: true });
  }
  if (d.action === 'recover') {
    if (!d.email) throw new HttpError(400, 'Introduce tu correo.');
    if (!process.env.SMTP_HOST)
      throw new HttpError(
        503,
        'La recuperación por correo aún no está configurada.',
      );
    await limit(`recover:${hash(d.email)}`, 3, 60);
    const user = await db.user.findUnique({ where: { email: d.email } });
    if (user) {
      const token = randomBytes(32).toString('base64url');
      await db.authToken.create({
        data: {
          userId: user.id,
          tokenHash: hash(token),
          kind: 'RESET',
          expiresAt: new Date(Date.now() + 1800000),
        },
      });
      await sendEmail(
        user.email,
        'Recupera tu cuenta TiendaMi',
        `${process.env.APP_URL}/cuenta?reset=${token}`,
      );
    }
    return NextResponse.json({
      ok: true,
      message: 'Si existe una cuenta, recibirás instrucciones.',
    });
  }
  if (d.action === 'reset' || d.action === 'verify') {
    if (!d.token) throw new HttpError(400, 'Enlace inválido.');
    const t = await db.authToken.findUnique({
      where: { tokenHash: hash(d.token) },
    });
    if (
      !t ||
      t.expiresAt < new Date() ||
      t.kind !== (d.action === 'reset' ? 'RESET' : 'VERIFY')
    )
      throw new HttpError(400, 'El enlace ya no es válido.');
    if (d.action === 'reset' && !d.password)
      throw new HttpError(
        400,
        'La contraseña debe tener al menos 12 caracteres.',
      );
    const passwordHash = d.password ? await argon2.hash(d.password) : undefined;
    await db.$transaction(async (tx) => {
      const consumed = await tx.authToken.deleteMany({ where: { id: t.id } });
      if (consumed.count !== 1)
        throw new HttpError(400, 'El enlace ya fue utilizado.');
      await tx.user.update({
        where: { id: t.userId },
        data:
          d.action === 'reset'
            ? { passwordHash, failedLogins: 0, lockedUntil: null }
            : { verifiedAt: new Date() },
      });
      if (d.action === 'reset')
        await tx.session.deleteMany({ where: { userId: t.userId } });
    });
    return NextResponse.json({ ok: true });
  }
  if (!d.email || !d.password)
    throw new HttpError(
      400,
      'Completa correo y contraseña (mínimo 12 caracteres).',
    );
  await limit(`login:${hash(d.email)}`, 10);
  let u = await db.user.findUnique({ where: { email: d.email } });
  if (d.action === 'register') {
    if (!d.name) throw new HttpError(400, 'Introduce tu nombre.');
    if (u)
      throw new HttpError(400, 'No se pudo crear la cuenta con estos datos.');
    u = await db.user.create({
      data: {
        email: d.email,
        name: d.name,
        passwordHash: await argon2.hash(d.password),
      },
    });
  } else {
    const dummy =
      '$argon2id$v=19$m=65536,t=3,p=4$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const valid = await argon2
      .verify(u?.passwordHash ?? dummy, d.password)
      .catch(() => false);
    if (
      !u ||
      u.blocked ||
      (u.lockedUntil && u.lockedUntil > new Date()) ||
      !valid
    ) {
      if (u)
        await db.user.update({
          where: { id: u.id },
          data: {
            failedLogins: { increment: 1 },
            ...(u.failedLogins >= 4
              ? { lockedUntil: new Date(Date.now() + 900000) }
              : {}),
          },
        });
      throw new HttpError(
        401,
        'Correo o contraseña incorrectos, o cuenta temporalmente bloqueada.',
      );
    }
    await db.user.update({
      where: { id: u.id },
      data: { failedLogins: 0, lockedUntil: null },
    });
  }
  if (d.action === 'login' && u.totpEnabled) {
    if (!d.otp) return NextResponse.json({ requiresTotp: true });
    if (!(await verifySecondFactor(u, d.otp)))
      throw new HttpError(
        401,
        'Código de segundo factor inválido o ya utilizado.',
      );
  }
  await createSession(u.id, req.headers.get('user-agent') ?? '', u.totpEnabled);
  return NextResponse.json({ ok: true, user: { name: u.name, role: u.role } });
});
export const GET = endpoint(async () => {
  const u = await requireUser();
  const sessions = await db.session.findMany({
    where: { userId: u.id, expiresAt: { gt: new Date() } },
    select: { id: true, createdAt: true, expiresAt: true, userAgent: true },
  });
  return NextResponse.json({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    verified: !!u.verifiedAt,
    twoFactorEnabled: u.totpEnabled,
    sessions,
  });
});
