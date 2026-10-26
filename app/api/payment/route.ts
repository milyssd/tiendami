export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { endpoint } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
export const GET = endpoint(async () => {
  await requireUser();
  const s = await db.setting.findUnique({ where: { key: 'store' } });
  const value = (s?.value ?? {}) as Record<string, unknown>;
  return NextResponse.json({
    bankDetails: value.bankDetails ?? '',
    hasQr: !!value.paymentQrFileId,
  });
});
