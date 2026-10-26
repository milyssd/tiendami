export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/server/db';
import { requireUser } from '@/lib/server/auth';
import { endpoint, sameOrigin, limit, HttpError } from '@/lib/server/http';
export const GET = endpoint(async () => {
  const u = await requireUser();
  if (u.role !== 'CUSTOMER') await requireUser(['ADMIN', 'SUPPORT']);
  return NextResponse.json(
    await db.ticket.findMany({
      where: u.role === 'CUSTOMER' ? { userId: u.id } : {},
      include: { messages: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    }),
  );
});
export const POST = endpoint(async (req) => {
  sameOrigin(req);
  const u = await requireUser();
  await limit(`ticket:${u.id}`, 10, 60);
  const d = z
    .object({
      subject: z.string().min(3).max(150),
      text: z.string().min(5).max(3000),
      orderId: z.string().uuid().optional(),
    })
    .strict()
    .parse(await req.json());
  if (
    d.orderId &&
    !(await db.order.findFirst({ where: { id: d.orderId, userId: u.id } }))
  )
    throw new HttpError(404, 'Pedido no encontrado.');
  return NextResponse.json(
    await db.ticket.create({
      data: {
        userId: u.id,
        subject: d.subject,
        orderId: d.orderId,
        messages: { create: { authorId: u.id, text: d.text } },
      },
    }),
    { status: 201 },
  );
});
