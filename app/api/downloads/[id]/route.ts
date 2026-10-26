export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { endpoint, limit, HttpError } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { db } from '@/lib/server/db';
import { storage } from '@/lib/server/storage';
export const GET = endpoint(async (req) => {
  const u = await requireUser();
  await limit(`download:${u.id}`, 30);
  const id = req.nextUrl.pathname.split('/')[3];
  const grant = await db.downloadGrant.findFirst({
    where: {
      id,
      orderItem: {
        order: {
          userId: u.id,
          paidAt: { not: null },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
      },
    },
    include: { file: true },
  });
  if (
    !grant ||
    (grant.expiresAt && grant.expiresAt < new Date()) ||
    grant.count >= grant.limit
  )
    throw new HttpError(404, 'Descarga no disponible.');
  const bytes = await storage.read(grant.file.path);
  const updated = await db.downloadGrant.updateMany({
    where: { id, count: { lt: grant.limit } },
    data: { count: { increment: 1 } },
  });
  if (!updated.count)
    throw new HttpError(429, 'Alcanzaste el límite de descargas.');
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': grant.file.mime,
      'Content-Disposition': `attachment; filename="recurso-${id}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
});
