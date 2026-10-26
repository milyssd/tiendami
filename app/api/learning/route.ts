export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { db } from '@/lib/server/db';
import { requireUser } from '@/lib/server/auth';
import { endpoint, sameOrigin, HttpError, limit } from '@/lib/server/http';
export const POST = endpoint(async (req) => {
  sameOrigin(req);
  const u = await requireUser();
  await limit(`progress:${u.id}`, 120);
  const d = z
    .object({
      enrollmentId: z.string().uuid(),
      lessonId: z.string().uuid(),
      seconds: z.number().int().min(0).max(86400),
      completed: z.boolean(),
    })
    .strict()
    .parse(await req.json());
  const en = await db.enrollment.findFirst({
    where: {
      id: d.enrollmentId,
      userId: u.id,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: {
      course: { include: { modules: { include: { lessons: true } } } },
    },
  });
  if (
    !en ||
    !en.course.modules.some((m) => m.lessons.some((l) => l.id === d.lessonId))
  )
    throw new HttpError(404, 'Lección no disponible.');
  await db.progress.upsert({
    where: {
      enrollmentId_lessonId: { enrollmentId: en.id, lessonId: d.lessonId },
    },
    create: {
      enrollmentId: en.id,
      lessonId: d.lessonId,
      seconds: d.seconds,
      completed: d.completed,
    },
    update: { seconds: d.seconds, ...(d.completed ? { completed: true } : {}) },
  });
  const count = await db.progress.count({
    where: { enrollmentId: en.id, completed: true },
  });
  const total = en.course.modules.reduce((s, m) => s + m.lessons.length, 0);
  if (total > 0 && count === total && !en.certificateCode)
    await db.enrollment.update({
      where: { id: en.id },
      data: { certificateCode: randomBytes(16).toString('hex') },
    });
  return NextResponse.json({ completed: count, total });
});
