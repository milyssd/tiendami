export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/server/db';
import { requireUser } from '@/lib/server/auth';
import {
  endpoint,
  sameOrigin,
  limit,
  ipHash,
  HttpError,
} from '@/lib/server/http';
import { parseCodes } from '@/lib/server/code-import';
import { encryptCode } from '@/lib/server/crypto';
export const POST = endpoint(async (req) => {
  sameOrigin(req);
  const u = await requireUser(['ADMIN']);
  await limit(`import:${u.id}`, 10, 60);
  const d = z
    .object({
      variantId: z.string().uuid(),
      csv: z.string().max(512000),
      commit: z.boolean().default(false),
    })
    .strict()
    .parse(await req.json());
  const variant = await db.variant.findFirst({
    where: { id: d.variantId, product: { type: 'DIGITAL' } },
  });
  if (!variant) throw new HttpError(400, 'Selecciona una variante digital.');
  let parsed;
  try {
    parsed = parseCodes(d.csv);
  } catch {
    throw new HttpError(
      400,
      'CSV inválido. Usa las columnas code,provider,cost,expiresAt; máximo 500 filas.',
    );
  }
  const existing = await db.digitalCode.findMany({
    where: { fingerprint: { in: parsed.rows.map((r) => r.fingerprint) } },
    select: { fingerprint: true },
  });
  const fingerprints = new Set(existing.map((e) => e.fingerprint));
  const errors = [
    ...parsed.errors,
    ...parsed.rows
      .filter((r) => fingerprints.has(r.fingerprint))
      .map(() => ({ row: 0, error: 'Un código ya existe en el inventario.' })),
  ];
  if (!d.commit)
    return NextResponse.json({
      valid: parsed.rows.length - existing.length,
      errors,
      preview: parsed.rows.map((r, i) => ({
        row: i + 2,
        provider: r.provider,
        cost: r.cost,
        expiresAt: r.expiresAt,
        code: '••••••••',
      })),
    });
  if (errors.length)
    throw new HttpError(400, 'Corrige todos los errores antes de importar.');
  await db.$transaction(async (tx) => {
    await tx.digitalCode.createMany({
      data: parsed.rows.map((r) => ({
        variantId: d.variantId,
        ...encryptCode(r.code),
        provider: r.provider,
        cost: r.cost,
        expiresAt: r.expiresAt,
      })),
    });
    await tx.auditLog.create({
      data: {
        actorId: u.id,
        action: 'CODES_IMPORTED',
        entityId: d.variantId,
        ipHash: ipHash(req),
        metadata: { count: parsed.rows.length },
      },
    });
  });
  return NextResponse.json({ imported: parsed.rows.length });
});
