export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/server/db';
import { requireUser } from '@/lib/server/auth';
import {
  endpoint,
  sameOrigin,
  limit,
  HttpError,
  ipHash,
} from '@/lib/server/http';
export const POST = endpoint(async (req) => {
  sameOrigin(req);
  const u = await requireUser();
  if (u.role !== 'CUSTOMER') await requireUser(['ADMIN', 'SUPPORT']);
  await limit(`project:${u.id}`, 30, 60);
  const id = req.nextUrl.pathname.split('/')[3];
  const p = await db.project.findFirst({
    where: { id, ...(u.role === 'CUSTOMER' ? { userId: u.id } : {}) },
  });
  if (!p) throw new HttpError(404, 'Proyecto no encontrado.');
  const d = z
    .discriminatedUnion('action', [
      z
        .object({
          action: z.literal('comment'),
          text: z.string().min(2).max(3000),
        })
        .strict(),
      z
        .object({
          action: z.literal('brief'),
          business: z.string().min(3).max(500),
          references: z.string().max(1000),
          colors: z.string().max(300),
          requirements: z.string().min(20).max(5000),
        })
        .strict(),
      z
        .object({
          action: z.literal('stage'),
          stage: z.enum([
            'BRIEFING',
            'DESIGN',
            'DEVELOPMENT',
            'REVIEW',
            'DELIVERY',
          ]),
        })
        .strict(),
    ])
    .parse(await req.json());
  if (d.action === 'stage' && u.role !== 'ADMIN')
    throw new HttpError(403, 'No tienes permiso.');
  await db.$transaction(async (tx) => {
    if (d.action === 'comment')
      await tx.projectEvent.create({
        data: { projectId: id, authorId: u.id, text: d.text },
      });
    if (d.action === 'brief') {
      await tx.project.update({
        where: { id },
        data: {
          brief: {
            business: d.business,
            references: d.references,
            colors: d.colors,
            requirements: d.requirements,
          },
        },
      });
      await tx.projectEvent.create({
        data: {
          projectId: id,
          authorId: u.id,
          text: 'Brief del proyecto actualizado.',
        },
      });
    }
    if (d.action === 'stage') {
      await tx.project.update({ where: { id }, data: { stage: d.stage } });
      await tx.auditLog.create({
        data: {
          actorId: u.id,
          action: 'PROJECT_STAGE_CHANGED',
          entityId: id,
          ipHash: ipHash(req),
        },
      });
      await tx.projectEvent.create({
        data: {
          projectId: id,
          authorId: u.id,
          text: `Etapa actualizada: ${d.stage}`,
        },
      });
    }
  });
  return NextResponse.json({ ok: true });
});
