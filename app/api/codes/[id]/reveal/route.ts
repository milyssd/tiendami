export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import {
  endpoint,
  sameOrigin,
  limit,
  ipHash,
  HttpError,
} from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { db } from '@/lib/server/db';
import { decryptCode } from '@/lib/server/crypto';
export const POST = endpoint(async (req) => {
  sameOrigin(req);
  const u = await requireUser();
  await limit(`reveal:${u.id}`, 10);
  const id = req.nextUrl.pathname.split('/')[3];
  const code = await db.digitalCode.findFirst({
    where: {
      id,
      status: 'DELIVERED',
      orderItem: { order: { userId: u.id, paidAt: { not: null } } },
    },
  });
  if (!code || !u.verifiedAt) throw new HttpError(404, 'Código no disponible.');
  await db.codeReveal.create({
    data: { codeId: code.id, userId: u.id, ipHash: ipHash(req) },
  });
  return NextResponse.json(
    { code: decryptCode(code.ciphertext, code.keyVersion) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
});
