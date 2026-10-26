import { Prisma, ProductType } from '@prisma/client';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { db } from './db';
import { calculate, riskScore } from './pricing';
import { HttpError } from './http';
export const checkoutSchema = z
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
    phone: z
      .string()
      .regex(
        /^\+?591[267][0-9]{7}$/,
        'Usa el formato +591 seguido de tu número.',
      ),
    paymentMethod: z.enum(['QR', 'TRANSFER', 'CASH']),
    shippingMethod: z.enum(['PICKUP', 'LOCAL', 'PROVINCE']),
    address: z
      .object({
        city: z.string().min(2).max(100),
        line: z.string().min(5).max(300),
        reference: z.string().max(300),
      })
      .strict()
      .optional(),
    coupon: z.string().max(40).optional(),
  })
  .strict();
export type Checkout = z.infer<typeof checkoutSchema>;
async function serializable<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let i = 0; i < 5; i++) {
    try {
      return await db.$transaction(fn, {
        isolationLevel: 'Serializable',
        maxWait: 10000,
        timeout: 20000,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2034' &&
        i < 4
      )
        continue;
      throw e;
    }
  }
  throw new Error('Transaction retry exhausted');
}
export async function createOrder(userId: string, data: Checkout) {
  return serializable(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const ids = data.items.map((i) => i.variantId);
    if (new Set(ids).size !== ids.length)
      throw new HttpError(400, 'Combina las cantidades del mismo producto.');
    const variants = await tx.variant.findMany({
      where: { id: { in: ids }, product: { active: true } },
      include: { product: true },
    });
    if (variants.length !== ids.length)
      throw new HttpError(400, 'Un producto ya no está disponible.');
    const physical = variants.some((v) => v.product.type === 'PHYSICAL');
    const digital = variants.some((v) => v.product.type === 'DIGITAL');
    if (digital && !user.verifiedAt)
      throw new HttpError(
        403,
        'Verifica tu correo antes de comprar códigos digitales.',
      );
    if (physical && data.shippingMethod !== 'PICKUP' && !data.address)
      throw new HttpError(400, 'Completa tu dirección de envío.');
    if (
      data.paymentMethod === 'CASH' &&
      (!physical ||
        data.shippingMethod !== 'LOCAL' ||
        variants.some((v) => v.product.type !== 'PHYSICAL'))
    )
      throw new HttpError(
        400,
        'Contra entrega solo para pedidos físicos con delivery local.',
      );
    const config = await tx.setting.findUnique({ where: { key: 'store' } });
    const settings = (config?.value ?? {}) as Record<string, unknown>;
    const rate = Number(settings.exchangeRate ?? 6.96);
    const local = Number(settings.localShipping ?? 1500);
    const province = Number(settings.provinceShipping ?? 3000);
    if (!Number.isFinite(rate) || rate <= 0)
      throw new Error('Invalid store rate');
    const coupon = data.coupon
      ? await tx.coupon.findUnique({
          where: { code: data.coupon.toUpperCase() },
        })
      : null;
    if (
      data.coupon &&
      (!coupon ||
        coupon.expiresAt < new Date() ||
        coupon.used >= coupon.maxUses)
    )
      throw new HttpError(400, 'Cupón no válido.');
    const lines = data.items.map((i) => {
      const v = variants.find((v) => v.id === i.variantId)!;
      if (v.product.type !== 'PHYSICAL' && i.quantity !== 1)
        throw new HttpError(
          400,
          'Añade una unidad por producto digital, curso o servicio.',
        );
      return { price: v.price, quantity: i.quantity, type: v.product.type };
    });
    const totals = calculate(
      lines,
      data.shippingMethod === 'PICKUP'
        ? 0
        : data.shippingMethod === 'LOCAL'
          ? local
          : province,
      coupon ?? undefined,
    );
    const recentOrders = await tx.order.count({
      where: { userId, createdAt: { gt: new Date(Date.now() - 86400000) } },
    });
    const score = riskScore({
      total: totals.total,
      accountAgeDays: (Date.now() - user.createdAt.getTime()) / 86400000,
      recentOrders,
      verifiedPhone: !!user.phoneVerifiedAt,
      email: user.email,
    });
    const expiresAt = new Date(Date.now() + 2 * 3600000);
    const order = await tx.order.create({
      data: {
        number: `TM-${randomBytes(6).toString('hex').toUpperCase()}`,
        userId,
        ...totals,
        exchangeRate: rate,
        riskScore: score,
        paymentMethod: data.paymentMethod,
        phone: data.phone,
        shippingAddress: physical
          ? { method: data.shippingMethod, ...data.address }
          : undefined,
        expiresAt,
        couponId: coupon?.id,
      },
    });
    for (const i of data.items) {
      const v = variants.find((v) => v.id === i.variantId)!;
      const item = await tx.orderItem.create({
        data: {
          orderId: order.id,
          variantId: v.id,
          productName: v.product.name,
          type: v.product.type,
          quantity: i.quantity,
          unitPrice: v.price,
        },
      });
      if (v.product.type === 'PHYSICAL') {
        const result = await tx.variant.updateMany({
          where: { id: v.id, stock: { gte: i.quantity } },
          data: { stock: { decrement: i.quantity } },
        });
        if (result.count !== 1)
          throw new HttpError(409, 'No queda suficiente stock.');
      }
      if (v.product.type === 'DIGITAL') {
        const code = await tx.digitalCode.findFirst({
          where: {
            variantId: v.id,
            status: 'AVAILABLE',
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          orderBy: { createdAt: 'asc' },
        });
        if (!code)
          throw new HttpError(409, 'Los códigos de este producto se agotaron.');
        const reserved = await tx.digitalCode.updateMany({
          where: { id: code.id, status: 'AVAILABLE' },
          data: {
            status: 'RESERVED',
            orderItemId: item.id,
            reservedUntil: expiresAt,
          },
        });
        if (reserved.count !== 1)
          throw new HttpError(409, 'Stock ocupado, vuelve a intentarlo.');
      }
    }
    if (coupon) {
      const applied = await tx.coupon.updateMany({
        where: { id: coupon.id, used: { lt: coupon.maxUses } },
        data: { used: { increment: 1 } },
      });
      if (applied.count !== 1) throw new HttpError(409, 'El cupón se agotó.');
    }
    return order;
  });
}
const handlers: Record<
  ProductType,
  (
    tx: Prisma.TransactionClient,
    item: Prisma.OrderItemGetPayload<{
      include: { variant: { include: { product: true } } };
    }>,
    userId: string,
  ) => Promise<void>
> = {
  PHYSICAL: async (tx, item) => {
    await tx.orderItem.update({
      where: { id: item.id },
      data: { status: 'PROCESSING' },
    });
  },
  DIGITAL: async (tx, item) => {
    const result = await tx.digitalCode.updateMany({
      where: {
        orderItemId: item.id,
        status: 'RESERVED',
        AND: [
          {
            OR: [
              { reservedUntil: null },
              { reservedUntil: { gt: new Date() } },
            ],
          },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        ],
      },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
        reservedUntil: null,
      },
    });
    if (result.count !== 1)
      throw new HttpError(
        409,
        'No existe una reserva válida para este código.',
      );
    await tx.orderItem.update({
      where: { id: item.id },
      data: { status: 'DELIVERED' },
    });
  },
  COURSE: async (tx, item, userId) => {
    const course = await tx.course.findUniqueOrThrow({
      where: { productId: item.variant.productId },
    });
    await tx.enrollment.upsert({
      where: { userId_courseId: { userId, courseId: course.id } },
      create: { courseId: course.id, userId, orderItemId: item.id },
      update: { expiresAt: null },
    });
    await tx.orderItem.update({
      where: { id: item.id },
      data: { status: 'DELIVERED' },
    });
  },
  SERVICE: async (tx, item, userId) => {
    await tx.project.create({
      data: {
        userId,
        orderItemId: item.id,
        milestones: {
          create: [
            {
              name: 'Proyecto contratado',
              amount: item.unitPrice * item.quantity,
            },
          ],
        },
      },
    });
    await tx.orderItem.update({
      where: { id: item.id },
      data: { status: 'PROCESSING' },
    });
  },
  DOWNLOAD: async (tx, item) => {
    const fileId = item.variant.product.downloadFileId;
    if (!fileId)
      throw new HttpError(
        409,
        'El archivo de este producto aún no está configurado.',
      );
    await tx.downloadGrant.create({ data: { fileId, orderItemId: item.id } });
    await tx.orderItem.update({
      where: { id: item.id },
      data: { status: 'DELIVERED' },
    });
  },
};
export const fulfillmentTypes = Object.keys(handlers);
export async function confirmPayment(
  orderId: string,
  actorId: string,
  ipHash: string,
  approveRisk = false,
) {
  return serializable(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: { include: { variant: { include: { product: true } } } },
      },
    });
    if (!order) throw new HttpError(404, 'Pedido no encontrado.');
    if (order.status !== 'PENDING' && order.status !== 'REVIEW')
      throw new HttpError(409, 'Este pedido ya fue procesado.');
    if (!order.paidAt && order.expiresAt < new Date())
      throw new HttpError(409, 'La reserva ha vencido.');
    const store = await tx.setting.findUnique({ where: { key: 'store' } });
    const rules = (store?.value ?? {}) as Record<string, unknown>;
    const threshold = Number(rules.riskThreshold ?? 60);
    const phoneLimit = Number(rules.phoneThreshold ?? 100000);
    if (
      order.items.some((i) => i.type === 'DIGITAL') &&
      (order.riskScore >= threshold ||
        (order.total >= phoneLimit && !order.user.phoneVerifiedAt)) &&
      !approveRisk
    ) {
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'REVIEW', paidAt: order.paidAt ?? new Date() },
      });
      await tx.digitalCode.updateMany({
        where: {
          status: 'RESERVED',
          orderItemId: { in: order.items.map((item) => item.id) },
        },
        data: { reservedUntil: null },
      });
      await tx.auditLog.create({
        data: { actorId, action: 'PAYMENT_HELD', entityId: orderId, ipHash },
      });
      return { status: 'REVIEW' };
    }
    for (const item of order.items)
      await handlers[item.type](tx, item, order.userId);
    const allInstant = order.items.every((i) =>
      ['DIGITAL', 'COURSE', 'DOWNLOAD'].includes(i.type),
    );
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: allInstant ? 'COMPLETED' : 'PROCESSING',
        paidAt: order.paidAt ?? new Date(),
      },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: approveRisk ? 'RISK_APPROVED_AND_PAID' : 'PAYMENT_CONFIRMED',
        entityId: orderId,
        ipHash,
      },
    });
    return { status: allInstant ? 'COMPLETED' : 'PROCESSING' };
  });
}
export async function expireOrders() {
  const orders = await db.order.findMany({
    where: {
      status: { in: ['PENDING', 'REVIEW'] },
      paidAt: null,
      expiresAt: { lt: new Date() },
    },
    select: { id: true },
  });
  for (const o of orders)
    await serializable(async (tx) => {
      const changed = await tx.order.updateMany({
        where: {
          id: o.id,
          status: { in: ['PENDING', 'REVIEW'] },
          paidAt: null,
        },
        data: { status: 'CANCELLED' },
      });
      if (!changed.count) return;
      const items = await tx.orderItem.findMany({ where: { orderId: o.id } });
      for (const i of items) {
        if (i.type === 'PHYSICAL')
          await tx.variant.update({
            where: { id: i.variantId },
            data: { stock: { increment: i.quantity } },
          });
      }
      await tx.digitalCode.updateMany({
        where: {
          orderItemId: { in: items.map((i) => i.id) },
          status: 'RESERVED',
        },
        data: { status: 'AVAILABLE', orderItemId: null, reservedUntil: null },
      });
      const order = await tx.order.findUniqueOrThrow({ where: { id: o.id } });
      if (order.couponId)
        await tx.coupon.update({
          where: { id: order.couponId },
          data: { used: { decrement: 1 } },
        });
    });
  return orders.length;
}
