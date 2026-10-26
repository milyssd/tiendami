export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { endpoint, HttpError, limit } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { db } from '@/lib/server/db';
import { storage } from '@/lib/server/storage';
export const GET = endpoint(async (req) => {
  const u = await requireUser();
  await limit(`files:${u.id}`, 60);
  const id = req.nextUrl.pathname.split('/')[3];
  const file = await db.storedFile.findUnique({ where: { id } });
  if (
    !file ||
    (file.ownerId !== u.id && !['ADMIN', 'SUPPORT'].includes(u.role))
  )
    throw new HttpError(404, 'Archivo no disponible.');
  if (file.ownerId !== u.id) await requireUser(['ADMIN', 'SUPPORT']);
  const bytes = await storage.read(file.path);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': file.mime,
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `attachment; filename="${file.id}.${file.mime === 'application/pdf' ? 'pdf' : 'webp'}"`,
    },
  });
});
