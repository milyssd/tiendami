export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { endpoint, HttpError } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { storage } from '@/lib/server/storage';
export const GET = endpoint(async () => {
  await requireUser();
  const s = await db.setting.findUnique({ where: { key: 'store' } });
  const value = (s?.value ?? {}) as Record<string, unknown>;
  const id = value.paymentQrFileId;
  if (typeof id !== 'string' || !id)
    throw new HttpError(404, 'El QR de pago aún no está configurado.');
  const f = await db.storedFile.findUnique({ where: { id } });
  if (!f || !f.mime.startsWith('image/'))
    throw new HttpError(404, 'QR no disponible.');
  return new NextResponse(new Uint8Array(await storage.read(f.path)), {
    headers: { 'Content-Type': f.mime, 'Cache-Control': 'private, no-store' },
  });
});
