export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { timingSafeEqual } from 'node:crypto';
import { endpoint, HttpError, limit } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { db } from '@/lib/server/db';
import { storage } from '@/lib/server/storage';
import { signPath, verifyPath, hash } from '@/lib/server/crypto';
export const GET = endpoint(async (req) => {
  const u = await requireUser();
  await limit(`media:${u.id}`, 600, 1);
  const [, , , lessonId, file] = req.nextUrl.pathname.split('/');
  if (
    !/^[a-zA-Z0-9-]+$/.test(lessonId) ||
    !/^([0-9]{5}\.ts|playlist\.m3u8|key\.bin)$/.test(file)
  )
    throw new HttpError(404, 'Archivo no disponible.');
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
  if (!lesson?.storagePath)
    throw new HttpError(404, 'El video todavía no está disponible.');
  const signedPath = `${u.id}/${lessonId}/${file}`;
  const mediaToken = (await cookies()).get(`tm_media_${lessonId}`)?.value;
  const active = mediaToken
    ? await db.mediaSession.findFirst({
        where: {
          tokenHash: hash(mediaToken),
          userId: u.id,
          lessonId,
          expiresAt: { gt: new Date() },
        },
      })
    : null;
  // Enrollment alone must not bypass the account's playback-session limit.
  // Every playlist, key and segment requires the same active, renewable lease.
  if (!active)
    throw new HttpError(403, 'Inicia o renueva la sesión de reproducción.');
  if (file !== 'playlist.m3u8') {
    const expires = Number(req.nextUrl.searchParams.get('expires'));
    const signature = req.nextUrl.searchParams.get('sig') ?? '';
    const currentSignature = verifyPath(signedPath, expires, signature);
    // An HLS player can retain segment URLs from its initial VOD playlist.
    // A renewed lease permits those authentic URLs after expiry, but must not
    // authorize a modified signature or a URL copied without the lease cookie.
    const resumedSignature =
      Number.isSafeInteger(expires) &&
      expires > 0 &&
      expires <= Date.now() &&
      /^[a-f0-9]{64}$/i.test(signature) &&
      timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(signPath(signedPath, expires), 'hex'),
      );
    if (!currentSignature && !resumedSignature)
      throw new HttpError(403, 'Enlace de reproducción no válido.');
  }
  const root = lesson.storagePath.replace(/\/playlist\.m3u8$/, '');
  const bytes = await storage.read(`${root}/${file}`);
  if (file === 'playlist.m3u8') {
    const expires = Date.now() + 120000;
    const link = (f: string) =>
      `/api/media/${lessonId}/${f}?expires=${expires}&sig=${signPath(`${u.id}/${lessonId}/${f}`, expires)}`;
    const playlist = bytes
      .toString()
      .split('\n')
      .map((line) =>
        line.startsWith('#EXT-X-KEY')
          ? line.replace(/URI="[^"]+"/, `URI="${link('key.bin')}"`)
          : /^\d{5}\.ts$/.test(line.trim())
            ? link(line.trim())
            : line,
      )
      .join('\n');
    return new NextResponse(playlist, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'private, no-store',
      },
    });
  }
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': file.endsWith('.ts')
        ? 'video/mp2t'
        : 'application/octet-stream',
      'Cache-Control': 'private, no-store',
    },
  });
});
