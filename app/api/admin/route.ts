export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/server/db';
import { requireUser } from '@/lib/server/auth';
import {
  endpoint,
  sameOrigin,
  audit,
  ipHash,
  HttpError,
} from '@/lib/server/http';
import { confirmPayment } from '@/lib/server/orders';
export const GET = endpoint(async () => {
  await requireUser(['ADMIN', 'SUPPORT']);
  const [orders, products, logs, settings, users] = await Promise.all([
    db.order.findMany({
      include: {
        user: { select: { email: true, name: true } },
        items: {
          select: {
            productName: true,
            quantity: true,
            type: true,
            status: true,
          },
        },
        files: { select: { id: true, mime: true, bytes: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    db.product.findMany({
      include: {
        variants: {
          include: {
            _count: { select: { codes: { where: { status: 'AVAILABLE' } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
    db.setting.findUnique({ where: { key: 'store' } }),
    db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        blocked: true,
        createdAt: true,
      },
      take: 100,
    }),
  ]);
  return NextResponse.json({
    orders,
    products,
    logs,
    settings: settings?.value,
    users,
  });
});
export const POST = endpoint(async (req) => {
  sameOrigin(req);
  const u = await requireUser(['ADMIN']);
  const body = z
    .discriminatedUnion('action', [
      z
        .object({
          action: z.literal('confirm'),
          orderId: z.string().uuid(),
          approveRisk: z.boolean().optional(),
        })
        .strict(),
      z
        .object({
          action: z.literal('stock'),
          variantId: z.string().uuid(),
          stock: z.number().int().min(0).max(100000),
          price: z.number().int().min(1).max(100000000),
        })
        .strict(),
      z
        .object({
          action: z.literal('toggle-product'),
          productId: z.string().uuid(),
          active: z.boolean(),
        })
        .strict(),
      z
        .object({
          action: z.literal('block'),
          userId: z.string().uuid(),
          blocked: z.boolean(),
        })
        .strict(),
      z
        .object({
          action: z.literal('settings'),
          settings: z
            .object({
              exchangeRate: z.number().positive().max(100),
              localShipping: z.number().int().min(0).max(100000),
              provinceShipping: z.number().int().min(0).max(100000),
              riskThreshold: z.number().int().min(0).max(100),
              phoneThreshold: z.number().int().min(0).max(10000000),
              whatsapp: z.string().regex(/^(\+?591[267][0-9]{7})?$/),
              bankDetails: z.string().max(1000),
            })
            .strict(),
        })
        .strict(),
      z
        .object({
          action: z.literal('ship'),
          itemId: z.string().uuid(),
          tracking: z.string().min(3).max(200),
          serial: z.string().max(100).optional(),
        })
        .strict(),
    ])
    .parse(await req.json());
  if (body.action === 'confirm')
    return NextResponse.json(
      await confirmPayment(body.orderId, u.id, ipHash(req), body.approveRisk),
    );
  if (body.action === 'stock') {
    await db.$transaction(async (tx) => {
      await tx.variant.update({
        where: { id: body.variantId },
        data: { stock: body.stock, price: body.price },
      });
      await tx.auditLog.create({
        data: {
          actorId: u.id,
          action: 'STOCK_UPDATED',
          entityId: body.variantId,
          ipHash: ipHash(req),
        },
      });
    });
    return NextResponse.json({ ok: true });
  }
  if (body.action === 'toggle-product') {
    await db.product.update({
      where: { id: body.productId },
      data: { active: body.active },
    });
    await audit(u.id, 'PRODUCT_VISIBILITY', body.productId, ipHash(req));
  }
  if (body.action === 'block') {
    if (body.userId === u.id)
      throw new HttpError(400, 'No puedes bloquear tu propia cuenta.');
    await db.user.update({
      where: { id: body.userId },
      data: { blocked: body.blocked },
    });
    await audit(u.id, 'USER_BLOCKED', body.userId, ipHash(req));
  }
  if (body.action === 'settings') {
    await db.$transaction(
      async (tx) => {
        const current = await tx.setting.findUnique({
          where: { key: 'store' },
        });
        const retained =
          current?.value &&
          typeof current.value === 'object' &&
          !Array.isArray(current.value)
            ? current.value
            : {};
        const value = { ...retained, ...body.settings };
        await tx.setting.upsert({
          where: { key: 'store' },
          create: { key: 'store', value },
          update: { value },
        });
        await tx.auditLog.create({
          data: {
            actorId: u.id,
            action: 'SETTINGS_UPDATED',
            entityId: 'store',
            ipHash: ipHash(req),
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  }
  if (body.action === 'ship') {
    await db.$transaction(async (tx) => {
      const item = await tx.orderItem.findFirst({
        where: {
          id: body.itemId,
          type: 'PHYSICAL',
          status: 'PROCESSING',
          order: { paidAt: { not: null } },
        },
      });
      if (!item) throw new HttpError(409, 'No se puede enviar este artículo.');
      await tx.orderItem.update({
        where: { id: body.itemId },
        data: {
          status: 'SHIPPED',
          tracking: body.tracking,
          serial: body.serial,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: u.id,
          action: 'ITEM_SHIPPED',
          entityId: item.id,
          ipHash: ipHash(req),
        },
      });
    });
  }
  return NextResponse.json({ ok: true });
});
