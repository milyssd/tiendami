export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/server/db';
import {
  endpoint,
  sameOrigin,
  limit,
  ipHash,
  HttpError,
} from '@/lib/server/http';
import { calculate } from '@/lib/server/pricing';
export const POST = endpoint(async (req) => {
  sameOrigin(req);
  await limit(`quote:${ipHash(req)}`, 100);
  const d = z
    .object({
      items: z
        .array(
          z
            .object({
              variantId: z.string().uuid(),
              quantity: z.number().int().min(1).max(10),
            })
            .strict(),
        )
        .min(1)
        .max(20),
      shippingMethod: z.enum(['PICKUP', 'LOCAL', 'PROVINCE']),
      coupon: z.string().max(40).optional(),
    })
    .strict()
    .parse(await req.json());
  if (new Set(d.items.map((i) => i.variantId)).size !== d.items.length)
    throw new HttpError(400, 'Productos repetidos.');
  const variants = await db.variant.findMany({
    where: {
      id: { in: d.items.map((i) => i.variantId) },
      product: { active: true },
    },
    include: { product: true },
  });
  if (variants.length !== d.items.length)
    throw new HttpError(400, 'Un producto no está disponible.');
  const setting = await db.setting.findUnique({ where: { key: 'store' } });
  const config = (setting?.value ?? {}) as Record<string, unknown>;
  const coupon = d.coupon
    ? await db.coupon.findUnique({ where: { code: d.coupon.toUpperCase() } })
    : null;
  if (
    d.coupon &&
    (!coupon || coupon.expiresAt < new Date() || coupon.used >= coupon.maxUses)
  )
    throw new HttpError(400, 'Cupón no válido.');
  const totals = calculate(
    d.items.map((i) => {
      const v = variants.find((v) => v.id === i.variantId)!;
      return { price: v.price, quantity: i.quantity, type: v.product.type };
    }),
    d.shippingMethod === 'PICKUP'
      ? 0
      : Number(
          config[
            d.shippingMethod === 'LOCAL' ? 'localShipping' : 'provinceShipping'
          ] ?? 1500,
        ),
    coupon ?? undefined,
  );
  return NextResponse.json({
    ...totals,
    bankDetails: String(config.bankDetails ?? ''),
    hasQr: !!config.paymentQrFileId,
    whatsapp: String(config.whatsapp ?? ''),
  });
});
