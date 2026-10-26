export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { randomBytes } from 'node:crypto';
import { db } from '@/lib/server/db';
import { requireUser, session } from '@/lib/server/auth';
import {
  endpoint,
  sameOrigin,
  limit,
  HttpError,
  audit,
  ipHash,
} from '@/lib/server/http';
import { encryptCode, decryptCode, hash } from '@/lib/server/crypto';
import { verifySecondFactor } from '@/lib/server/totp';
export const POST = endpoint(async (req) => {
  sameOrigin(req);
  const u = await requireUser();
  await limit(`2fa:${u.id}`, 10);
  const d = z
    .object({
      action: z.enum(['setup', 'enable', 'disable']),
      otp: z.string().min(6).max(30).optional(),
    })
    .strict()
    .parse(await req.json());
  if (d.action === 'setup') {
    if (u.totpEnabled)
      throw new HttpError(409, 'El segundo factor ya está activo.');
    const secret = authenticator.generateSecret();
    const encrypted = encryptCode(secret);
    await db.user.update({
      where: { id: u.id },
      data: {
        totpPendingCipher: encrypted.ciphertext,
        totpPendingVersion: encrypted.keyVersion,
      },
    });
    const uri = authenticator.keyuri(u.email, 'TiendaMi', secret);
    await audit(u.id, 'TOTP_SETUP_STARTED', u.id, ipHash(req));
    return NextResponse.json(
      { qr: await QRCode.toDataURL(uri), secret },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }
  if (!d.otp)
    throw new HttpError(400, 'Introduce el código de tu autenticador.');
  if (d.action === 'enable') {
    if (u.totpEnabled || !u.totpPendingCipher || !u.totpPendingVersion)
      throw new HttpError(409, 'Inicia la configuración de nuevo.');
    const secret = decryptCode(u.totpPendingCipher, u.totpPendingVersion);
    if (!authenticator.check(d.otp, secret))
      throw new HttpError(400, 'Código no válido.');
    const recovery = Array.from({ length: 8 }, () =>
      randomBytes(8).toString('hex').toUpperCase(),
    );
    const s = await session();
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: u.id },
        data: {
          totpEnabled: true,
          totpCipher: u.totpPendingCipher,
          totpKeyVersion: u.totpPendingVersion,
          totpPendingCipher: null,
          totpPendingVersion: null,
          recoveryHashes: recovery.map(hash),
        },
      });
      await tx.session.deleteMany({
        where: { userId: u.id, id: { not: s!.id } },
      });
      await tx.session.update({
        where: { id: s!.id },
        data: { twoFactorVerified: true },
      });
      await tx.auditLog.create({
        data: {
          actorId: u.id,
          action: 'TOTP_ENABLED',
          entityId: u.id,
          ipHash: ipHash(req),
        },
      });
    });
    return NextResponse.json(
      { recoveryCodes: recovery },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }
  if (u.role === 'ADMIN')
    throw new HttpError(
      403,
      'El segundo factor es obligatorio para administración.',
    );
  if (!(await verifySecondFactor(u, d.otp)))
    throw new HttpError(400, 'Código no válido o ya utilizado.');
  await db.user.update({
    where: { id: u.id },
    data: {
      totpEnabled: false,
      totpCipher: null,
      totpKeyVersion: null,
      recoveryHashes: [],
      totpLastStep: null,
    },
  });
  await db.session.deleteMany({ where: { userId: u.id } });
  await audit(u.id, 'TOTP_DISABLED', u.id, ipHash(req));
  return NextResponse.json({ ok: true });
});
