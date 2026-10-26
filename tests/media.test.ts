import { it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID, randomBytes } from 'node:crypto';
import { db } from '../lib/server/db';
import { hash, signPath } from '../lib/server/crypto';
const ffmpeg =
  spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
it.skipIf(!ffmpeg || !process.env.TEST_BASE_URL)(
  'prepares encrypted HLS, decodes it and serves signed assets only to the enrolled student',
  async () => {
    const tag = `media-test-${randomUUID()}`;
    const work = await mkdtemp(join(tmpdir(), 'tiendami-video-'));
    let uid = '';
    let pid = '';
    let cid = '';
    let courseId = '';
    let moduleId = '';
    let lessonId = '';
    let orderId = '';
    let enrollmentId = '';
    try {
      const u = await db.user.create({
        data: {
          email: `${tag}@example.invalid`,
          name: 'Video Test',
          passwordHash: 'not-a-login-hash',
        },
      });
      uid = u.id;
      const c = await db.category.create({ data: { slug: tag, name: 'Test' } });
      cid = c.id;
      const p = await db.product.create({
        data: {
          slug: tag,
          name: 'Video test',
          description: 'Test',
          type: 'COURSE',
          categoryId: cid,
          image: '/art/course.svg',
          imageAlt: 'Test',
          variants: { create: { name: 'Test', sku: tag, price: 1000 } },
        },
        include: { variants: true },
      });
      pid = p.id;
      const course = await db.course.create({
        data: {
          productId: pid,
          instructor: 'Test',
          level: 'Test',
          modules: {
            create: {
              title: 'Test',
              position: 1,
              lessons: { create: { title: 'Video', position: 1 } },
            },
          },
        },
        include: { modules: { include: { lessons: true } } },
      });
      courseId = course.id;
      moduleId = course.modules[0].id;
      lessonId = course.modules[0].lessons[0].id;
      const o = await db.order.create({
        data: {
          number: tag,
          userId: uid,
          status: 'COMPLETED',
          subtotal: 1000,
          total: 1000,
          shipping: 0,
          exchangeRate: 6.96,
          paymentMethod: 'TRANSFER',
          phone: '+59171234567',
          paidAt: new Date(),
          expiresAt: new Date(Date.now() + 3600000),
          items: {
            create: {
              variantId: p.variants[0].id,
              productName: 'Video test',
              type: 'COURSE',
              quantity: 1,
              unitPrice: 1000,
              status: 'DELIVERED',
            },
          },
        },
        include: { items: true },
      });
      orderId = o.id;
      enrollmentId = (
        await db.enrollment.create({
          data: { userId: uid, courseId, orderItemId: o.items[0].id },
        })
      ).id;
      const input = join(work, 'test.mp4');
      const source = spawnSync(
        'ffmpeg',
        [
          '-y',
          '-f',
          'lavfi',
          '-i',
          'testsrc=size=320x180:rate=10',
          '-t',
          '2',
          '-pix_fmt',
          'yuv420p',
          input,
        ],
        { encoding: 'utf8' },
      );
      expect(source.status, source.stderr.slice(-1000)).toBe(0);
      const prepared = spawnSync(
        process.execPath,
        [
          'node_modules/tsx/dist/cli.mjs',
          'scripts/prepare-video.ts',
          lessonId,
          input,
        ],
        { encoding: 'utf8', timeout: 30000 },
      );
      expect(prepared.status, prepared.stderr.slice(-1500)).toBe(0);
      const playlist = resolve(
        process.env.STORAGE_ROOT ?? './storage/private',
        'courses',
        lessonId,
        'playlist.m3u8',
      );
      const decoded = spawnSync(
        'ffmpeg',
        ['-allowed_extensions', 'ALL', '-i', playlist, '-f', 'null', '-'],
        { encoding: 'utf8', timeout: 15000 },
      );
      expect(decoded.status, decoded.stderr.slice(-1000)).toBe(0);
      const token = randomBytes(32).toString('base64url');
      await db.session.create({
        data: {
          tokenHash: hash(token),
          userId: uid,
          expiresAt: new Date(Date.now() + 60000),
        },
      });
      const base = process.env.TEST_BASE_URL!;
      const headers = {
        Cookie: `tm_session=${token}`,
        Origin: process.env.APP_URL!,
        'Content-Type': 'application/json',
      };
      const unauthorized = await fetch(
        `${base}/api/media/${lessonId}/playlist.m3u8`,
      );
      expect(unauthorized.status).toBe(401);
      const withoutPlaybackSession = await fetch(
        `${base}/api/media/${lessonId}/playlist.m3u8`,
        { headers },
      );
      expect(withoutPlaybackSession.status).toBe(403);
      const session = await fetch(`${base}/api/media-session`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ lessonId }),
      });
      expect(session.status).toBe(200);
      const mediaCookie = session.headers
        .getSetCookie()
        .find((cookie) => cookie.startsWith(`tm_media_${lessonId}=`))
        ?.split(';')[0];
      expect(mediaCookie).toBeTruthy();
      const mediaHeaders = {
        ...headers,
        Cookie: `${headers.Cookie}; ${mediaCookie}`,
      };
      const res = await fetch(`${base}/api/media/${lessonId}/playlist.m3u8`, {
        headers: mediaHeaders,
      });
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain('METHOD=AES-128');
      const uri = text.match(/URI="([^"]+)"/)?.[1];
      expect(uri).toContain('sig=');
      const key = await fetch(base + uri, { headers: mediaHeaders });
      expect(key.status).toBe(200);
      expect((await key.arrayBuffer()).byteLength).toBe(16);
      const signatureWithoutSession = await fetch(base + uri, { headers });
      expect(signatureWithoutSession.status).toBe(403);
      const invalid = await fetch(
        `${base}/api/media/${lessonId}/key.bin?expires=1&sig=invalid`,
        { headers: mediaHeaders },
      );
      expect(invalid.status).toBe(403);

      // Simulate another browser: it has the account cookie but no media cookie.
      const secondSession = await fetch(`${base}/api/media-session`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ lessonId }),
      });
      expect(secondSession.status).toBe(200);
      const thirdSession = await fetch(`${base}/api/media-session`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ lessonId }),
      });
      expect(thirdSession.status).toBe(429);
      expect(await db.mediaSession.count({ where: { userId: uid } })).toBe(2);

      // A lease that expires stops all reads, even for an enrolled account.
      const mediaToken = mediaCookie!.slice(mediaCookie!.indexOf('=') + 1);
      await db.mediaSession.update({
        where: { tokenHash: hash(mediaToken) },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      const expiredSession = await fetch(
        `${base}/api/media/${lessonId}/playlist.m3u8`,
        { headers: mediaHeaders },
      );
      expect(expiredSession.status).toBe(403);
      const renewedSession = await fetch(`${base}/api/media-session`, {
        method: 'POST',
        headers: mediaHeaders,
        body: JSON.stringify({ lessonId }),
      });
      expect(renewedSession.status).toBe(200);
      const renewedCookie = renewedSession.headers
        .getSetCookie()
        .find((cookie) => cookie.startsWith(`tm_media_${lessonId}=`))
        ?.split(';')[0];
      expect(renewedCookie).toBeTruthy();
      const renewedHeaders = {
        ...headers,
        Cookie: `${headers.Cookie}; ${renewedCookie}`,
      };
      const expired = Date.now() - 1000;
      const expiredSignature = signPath(`${uid}/${lessonId}/key.bin`, expired);
      const resumedKey = await fetch(
        `${base}/api/media/${lessonId}/key.bin?expires=${expired}&sig=${expiredSignature}`,
        { headers: renewedHeaders },
      );
      expect(resumedKey.status).toBe(200);
      expect((await resumedKey.arrayBuffer()).byteLength).toBe(16);
      const progress = await fetch(`${base}/api/learning`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          enrollmentId,
          lessonId,
          seconds: 2,
          completed: true,
        }),
      });
      expect(progress.status).toBe(200);
      expect(
        (await db.enrollment.findUniqueOrThrow({ where: { id: enrollmentId } }))
          .certificateCode,
      ).toBeTruthy();
      const cert = await fetch(`${base}/api/certificates/${enrollmentId}`, {
        headers,
      });
      expect(cert.status).toBe(200);
      expect(
        Buffer.from(await cert.arrayBuffer())
          .subarray(0, 4)
          .toString(),
      ).toBe('%PDF');
    } finally {
      if (enrollmentId) {
        await db.progress.deleteMany({ where: { enrollmentId } });
        await db.enrollment.deleteMany({ where: { id: enrollmentId } });
      }
      if (orderId) {
        await db.orderItem.deleteMany({ where: { orderId } });
        await db.order.deleteMany({ where: { id: orderId } });
      }
      if (lessonId) await db.lesson.deleteMany({ where: { id: lessonId } });
      if (moduleId)
        await db.courseModule.deleteMany({ where: { id: moduleId } });
      if (courseId) await db.course.deleteMany({ where: { id: courseId } });
      if (pid) {
        await db.variant.deleteMany({ where: { productId: pid } });
        await db.product.deleteMany({ where: { id: pid } });
      }
      if (cid) await db.category.deleteMany({ where: { id: cid } });
      if (uid) {
        await db.mediaSession.deleteMany({ where: { userId: uid } });
        await db.user.deleteMany({ where: { id: uid } });
      }
      await rm(work, { recursive: true, force: true });
      if (lessonId)
        await rm(
          resolve(
            process.env.STORAGE_ROOT ?? './storage/private',
            'courses',
            lessonId,
          ),
          { recursive: true, force: true },
        );
      await db.$disconnect();
    }
  },
  60000,
);
