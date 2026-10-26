export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { endpoint, sameOrigin, limit } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { createOrder, checkoutSchema } from '@/lib/server/orders';
import { db } from '@/lib/server/db';
export const POST = endpoint(async (req) => {
  sameOrigin(req);
  const u = await requireUser();
  await limit(`checkout:${u.id}`, 10);
  const order = await createOrder(u.id, checkoutSchema.parse(await req.json()));
  return NextResponse.json(
    { id: order.id, number: order.number, total: order.total },
    { status: 201 },
  );
});
export const GET = endpoint(async () => {
  const u = await requireUser();
  const orders = await db.order.findMany({
    where: { userId: u.id },
    select: {
      id: true,
      number: true,
      status: true,
      total: true,
      createdAt: true,
      expiresAt: true,
      items: {
        select: {
          id: true,
          productName: true,
          type: true,
          quantity: true,
          unitPrice: true,
          status: true,
          tracking: true,
          code: { select: { id: true, status: true } },
          project: { select: { id: true, stage: true } },
          enrollment: { select: { id: true, courseId: true } },
          download: { select: { id: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(orders);
});
