export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { endpoint, sameOrigin, limit, HttpError } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { storage, optimizeImage } from '@/lib/server/storage';
import { db } from '@/lib/server/db';
export const POST = endpoint(async (req) => {
  sameOrigin(req);
  const u = await requireUser();
  await limit(`upload:${u.id}`, 10, 60);
  if (Number(req.headers.get('content-length') ?? 0) > 9 * 1024 * 1024)
    throw new HttpError(413, 'Máximo 8 MB por imagen.');
  const form = await req.formData();
  const file = form.get('file');
  const orderId = z.string().uuid().parse(form.get('orderId'));
  const order = await db.order.findFirst({
    where: { id: orderId, userId: u.id, status: { in: ['PENDING', 'REVIEW'] } },
  });
  if (!order) throw new HttpError(404, 'Pedido no encontrado.');
  if (!(file instanceof File) || file.size > 8 * 1024 * 1024)
    throw new HttpError(
      400,
      'Selecciona una imagen JPG, PNG o WebP de hasta 8 MB.',
    );
  let result;
  try {
    result = await optimizeImage(Buffer.from(await file.arrayBuffer()));
  } catch {
    throw new HttpError(400, 'Imagen no válida. Usa JPG, PNG o WebP.');
  }
  const path = await storage.write(result.optimized, 'webp');
  try {
    const saved = await db.storedFile.create({
      data: {
        ownerId: u.id,
        orderId,
        path,
        mime: 'image/webp',
        bytes: result.optimized.length,
        originalBytes: result.originalBytes,
      },
    });
    return NextResponse.json(
      { id: saved.id, bytes: saved.bytes, originalBytes: saved.originalBytes },
      { status: 201 },
    );
  } catch (e) {
    await storage.remove(path);
    throw e;
  }
});
