export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/lib/server/db';
import { requireUser } from '@/lib/server/auth';
import { hash } from '@/lib/server/crypto';
import { endpoint, sameOrigin, limit, HttpError } from '@/lib/server/http';
export const POST = endpoint(async (req) => {
  sameOrigin(req);
  const u = await requireUser();
  await limit(`playback:${u.id}`, 60);
  const { lessonId } = z
    .object({ lessonId: z.string().uuid() })
    .strict()
    .parse(await req.json());
  const lesson = await db.lesson.findFirst({
    where: {
      id: lessonId,
      module: {
        course: {
          enrollments: {
            some: {
              userId: u.id,
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
          },
        },
      },
    },
  });
  if (!lesson?.storagePath) throw new HttpError(404, 'Video no disponible.');
  const name = `tm_media_${lessonId}`;
  const previous = (await cookies()).get(name)?.value;
  const token = previous ?? randomBytes(32).toString('base64url');
  const tokenHash = hash(token);
  const expiresAt = new Date(Date.now() + 120000);
  await db.$transaction(
    async (tx) => {
      await tx.mediaSession.deleteMany({
        where: { expiresAt: { lte: new Date() } },
      });
      const own = await tx.mediaSession.findFirst({
        where: { tokenHash, userId: u.id, lessonId },
      });
      if (own) {
        await tx.mediaSession.update({
          where: { id: own.id },
          data: { expiresAt },
        });
        return;
      }
      const active = await tx.mediaSession.count({
        where: { userId: u.id, expiresAt: { gt: new Date() } },
      });
      if (active >= 2)
        throw new HttpError(
          429,
          'Ya tienes dos reproducciones activas. Pausa una y espera dos minutos para iniciar otra.',
        );
      await tx.mediaSession.create({
        data: { tokenHash, userId: u.id, lessonId, expiresAt },
      });
    },
    { isolationLevel: 'Serializable' },
  );
  (await cookies()).set(name, token, {
    httpOnly: true,
    secure: process.env.APP_URL?.startsWith('https:') ?? false,
    sameSite: 'lax',
    path: '/api',
    expires: expiresAt,
  });
  return NextResponse.json(
    { ok: true, expiresAt },
    { headers: { 'Cache-Control': 'no-store' } },
  );
});
