export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import sanitize from 'sanitize-html';
import { db } from '@/lib/server/db';
import { requireUser } from '@/lib/server/auth';
import { endpoint, sameOrigin, limit, HttpError } from '@/lib/server/http';
export const POST = endpoint(async (req) => {
  sameOrigin(req);
  const u = await requireUser();
  await limit(`review:${u.id}`, 5, 60);
  const d = z
    .object({
      productId: z.string().uuid(),
      rating: z.number().int().min(1).max(5),
      text: z.string().min(10).max(2000),
    })
    .strict()
    .parse(await req.json());
  const purchased = await db.orderItem.findFirst({
    where: {
      variant: { productId: d.productId },
      order: {
        userId: u.id,
        paidAt: { not: null },
        status: { notIn: ['CANCELLED', 'REFUNDED'] },
      },
    },
  });
  if (!purchased)
    throw new HttpError(403, 'Solo los compradores pueden dejar una reseña.');
  const review = await db.review.upsert({
    where: { userId_productId: { userId: u.id, productId: d.productId } },
    create: {
      userId: u.id,
      ...d,
      text: sanitize(d.text, { allowedTags: [], allowedAttributes: {} }),
    },
    update: {
      rating: d.rating,
      text: sanitize(d.text, { allowedTags: [], allowedAttributes: {} }),
      approved: false,
    },
  });
  return NextResponse.json({ id: review.id, moderation: 'pending' });
});
