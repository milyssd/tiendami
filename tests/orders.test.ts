import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import { db } from '../lib/server/db';
import { storage } from '../lib/server/storage';
import sharp from 'sharp';
import type { Prisma } from '@prisma/client';
import {
  createOrder,
  confirmPayment,
  expireOrders,
} from '../lib/server/orders';
import { encryptCode, decryptCode, hash } from '../lib/server/crypto';
const tag = `test-${randomUUID()}`;
let userId: string;
let otherId: string;
let categoryId: string;
const products: string[] = [];
const variants: Record<string, string> = {};
const createdOrders: string[] = [];
let adminToken = '';
const tokens: string[] = [];
async function makeOrder(key: string, quantity = 1) {
  const order = await createOrder(userId, {
    items: [{ variantId: variants[key], quantity }],
    phone: '+59171234567',
    paymentMethod: 'TRANSFER',
    shippingMethod: 'PICKUP',
  });
  createdOrders.push(order.id);
  return order;
}
beforeAll(async () => {
  const u = await db.user.create({
    data: {
      email: `${tag}@example.invalid`,
      name: 'Integration Test',
      passwordHash: 'not-a-login-hash',
      verifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
      createdAt: new Date(Date.now() - 30 * 86400000),
    },
  });
  userId = u.id;
  otherId = (
    await db.user.create({
      data: {
        email: `other-${tag}@example.invalid`,
        name: 'Other Test',
        passwordHash: 'not-a-login-hash',
        verifiedAt: new Date(),
      },
    })
  ).id;
  const category = await db.category.create({ data: { slug: tag, name: tag } });
  categoryId = category.id;
  for (const type of [
    'PHYSICAL',
    'DIGITAL',
    'COURSE',
    'SERVICE',
    'DOWNLOAD',
  ] as const) {
    const p = await db.product.create({
      data: {
        slug: `${tag}-${type}`,
        name: `Test ${type}`,
        description: 'Test fixture',
        type,
        categoryId,
        image: '/art/controller.svg',
        imageAlt: 'Test',
        variants: {
          create: {
            name: 'Test',
            sku: `${tag}-${type}`,
            price: 1000,
            stock: type === 'PHYSICAL' ? 1 : 0,
          },
        },
      },
      include: { variants: true },
    });
    products.push(p.id);
    variants[type] = p.variants[0].id;
    if (type === 'COURSE')
      await db.course.create({
        data: { productId: p.id, instructor: 'Test', level: 'Test' },
      });
    if (type === 'DOWNLOAD') {
      const f = await db.storedFile.create({
        data: {
          ownerId: userId,
          path: `${tag}.pdf`,
          mime: 'application/pdf',
          bytes: 1,
          originalBytes: 1,
        },
      });
      await db.product.update({
        where: { id: p.id },
        data: { downloadFileId: f.id },
      });
    }
  }
  await db.digitalCode.create({
    data: {
      variantId: variants.DIGITAL,
      ...encryptCode(`TEST-ONLY-${randomUUID()}`),
      provider: tag,
      cost: 500,
    },
  });
});
afterAll(async () => {
  const items = await db.orderItem.findMany({
    where: { order: { userId: { in: [userId, otherId] } } },
    select: { id: true },
  });
  const itemIds = items.map((i) => i.id);
  const projects = await db.project.findMany({
    where: { userId },
    select: { id: true },
  });
  await db.projectEvent.deleteMany({
    where: { projectId: { in: projects.map((p) => p.id) } },
  });
  await db.milestone.deleteMany({
    where: { projectId: { in: projects.map((p) => p.id) } },
  });
  await db.project.deleteMany({ where: { userId } });
  await db.progress.deleteMany({ where: { enrollment: { userId } } });
  await db.enrollment.deleteMany({ where: { userId } });
  await db.downloadGrant.deleteMany({
    where: { orderItemId: { in: itemIds } },
  });
  const files = await db.storedFile.findMany({
    where: { ownerId: { in: [userId, otherId] } },
    select: { path: true },
  });
  for (const file of files)
    await storage.remove(file.path).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  await db.storedFile.deleteMany({
    where: { ownerId: { in: [userId, otherId] } },
  });
  await db.codeReveal.deleteMany({ where: { code: { provider: tag } } });
  await db.digitalCode.deleteMany({ where: { provider: tag } });
  await db.orderItem.deleteMany({ where: { id: { in: itemIds } } });
  await db.order.deleteMany({ where: { userId: { in: [userId, otherId] } } });
  await db.course.deleteMany({ where: { productId: { in: products } } });
  await db.variant.deleteMany({ where: { productId: { in: products } } });
  await db.product.deleteMany({ where: { id: { in: products } } });
  await db.category.delete({ where: { id: categoryId } });
  await db.auditLog.deleteMany({ where: { actorId: userId } });
  await db.user.deleteMany({ where: { id: { in: [userId, otherId] } } });
  await db.$disconnect();
});
describe('real MySQL order transactions', () => {
  it('allocates a code once under concurrent checkout', async () => {
    const attempts = await Promise.allSettled(
      Array.from({ length: 6 }, () => makeOrder('DIGITAL')),
    );
    const passed = attempts.filter((a) => a.status === 'fulfilled');
    expect(passed).toHaveLength(1);
    expect(attempts.filter((a) => a.status === 'rejected')).toHaveLength(5);
    const code = await db.digitalCode.findFirstOrThrow({
      where: { provider: tag },
    });
    expect(code.status).toBe('RESERVED');
    expect(code.orderItemId).toBeTruthy();
  });
  it('fulfills a paid digital item once and prevents duplicate payment confirmation', async () => {
    const order = await db.order.findFirstOrThrow({
      where: { userId, items: { some: { type: 'DIGITAL' } } },
    });
    await confirmPayment(order.id, userId, 'test');
    const code = await db.digitalCode.findFirstOrThrow({
      where: { provider: tag },
    });
    expect(code.status).toBe('DELIVERED');
    expect(decryptCode(code.ciphertext, code.keyVersion)).toMatch(
      /^TEST-ONLY-/,
    );
    await expect(confirmPayment(order.id, userId, 'test')).rejects.toThrow();
  });
  it('never oversells physical inventory under concurrent checkout', async () => {
    const r = await Promise.allSettled([
      makeOrder('PHYSICAL'),
      makeOrder('PHYSICAL'),
    ]);
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect(
      (await db.variant.findUniqueOrThrow({ where: { id: variants.PHYSICAL } }))
        .stock,
    ).toBe(0);
  });
  it('releases expired physical stock exactly once', async () => {
    const order = await db.order.findFirstOrThrow({
      where: { userId, items: { some: { type: 'PHYSICAL' } } },
    });
    await db.order.update({
      where: { id: order.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await expireOrders();
    await expireOrders();
    expect(
      (await db.variant.findUniqueOrThrow({ where: { id: variants.PHYSICAL } }))
        .stock,
    ).toBe(1);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: order.id } })).status,
    ).toBe('CANCELLED');
  });
  it('fulfills course, service and download independently in one mixed order', async () => {
    const order = await createOrder(userId, {
      items: ['COURSE', 'SERVICE', 'DOWNLOAD'].map((k) => ({
        variantId: variants[k],
        quantity: 1,
      })),
      phone: '+59171234567',
      paymentMethod: 'TRANSFER',
      shippingMethod: 'PICKUP',
    });
    createdOrders.push(order.id);
    await confirmPayment(order.id, userId, 'test');
    expect(await db.enrollment.count({ where: { userId } })).toBe(1);
    expect(await db.project.count({ where: { userId } })).toBe(1);
    expect(
      await db.downloadGrant.count({
        where: { orderItem: { orderId: order.id } },
      }),
    ).toBe(1);
    const items = await db.orderItem.findMany({ where: { orderId: order.id } });
    expect(items.find((i) => i.type === 'SERVICE')?.status).toBe('PROCESSING');
    expect(items.find((i) => i.type === 'COURSE')?.status).toBe('DELIVERED');
  });
  it('keeps paid risk holds reserved beyond the unpaid deadline and approves them later', async () => {
    await db.digitalCode.create({
      data: {
        variantId: variants.DIGITAL,
        ...encryptCode(`TEST-ONLY-${randomUUID()}`),
        provider: tag,
        cost: 500,
      },
    });
    const order = await makeOrder('DIGITAL');
    await db.order.update({
      where: { id: order.id },
      data: { riskScore: 100 },
    });
    expect(await confirmPayment(order.id, userId, 'test')).toEqual({
      status: 'REVIEW',
    });
    expect(
      await db.digitalCode.count({
        where: { provider: tag, status: 'RESERVED' },
      }),
    ).toBe(1);
    const held = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(held.paidAt).not.toBeNull();
    await db.order.update({
      where: { id: order.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await expireOrders();
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: order.id } })).status,
    ).toBe('REVIEW');
    expect(
      (
        await db.digitalCode.findFirstOrThrow({
          where: { provider: tag, status: 'RESERVED' },
        })
      ).reservedUntil,
    ).toBeNull();
    await confirmPayment(order.id, userId, 'test', true);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: order.id } })).status,
    ).toBe('COMPLETED');
  });
  it.skipIf(!process.env.TEST_BASE_URL)(
    'requires admin second factor and securely enables it via authenticated session',
    async () => {
      const { authenticator } = await import('otplib');
      const { verifySecondFactor } = await import('../lib/server/totp');
      const token = randomBytes(32).toString('base64url');
      adminToken = token;
      await db.user.update({ where: { id: userId }, data: { role: 'ADMIN' } });
      await db.session.create({
        data: {
          userId,
          tokenHash: hash(token),
          expiresAt: new Date(Date.now() + 60000),
        },
      });
      const base = process.env.TEST_BASE_URL!;
      const headers = {
        Cookie: `tm_session=${token}`,
        Origin: process.env.APP_URL!,
        'Content-Type': 'application/json',
      };
      expect((await fetch(`${base}/api/admin`, { headers })).status).toBe(403);
      expect((await fetch(`${base}/api/support`, { headers })).status).toBe(
        403,
      );
      const project = await db.project.findFirstOrThrow({ where: { userId } });
      expect(
        (
          await fetch(`${base}/api/projects/${project.id}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ action: 'stage', stage: 'DESIGN' }),
          })
        ).status,
      ).toBe(403);
      const projectPage = await fetch(`${base}/proyecto/${project.id}`, {
        headers,
        redirect: 'manual',
      });
      expect(projectPage.status).toBe(307);
      const otherFile = await db.storedFile.create({
        data: {
          ownerId: otherId,
          path: `${tag}-private.pdf`,
          mime: 'application/pdf',
          bytes: 1,
          originalBytes: 1,
        },
      });
      expect(
        (await fetch(`${base}/api/files/${otherFile.id}`, { headers })).status,
      ).toBe(403);

      const setup = await fetch(`${base}/api/security`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'setup' }),
      });
      expect(setup.status).toBe(200);
      const config = await setup.json();
      expect(config.qr).toMatch(/^data:image\/png/);
      const code = authenticator.generate(config.secret);
      const enable = await fetch(`${base}/api/security`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'enable', otp: code }),
      });
      expect(enable.status).toBe(200);
      const result = await enable.json();
      expect(result.recoveryCodes).toHaveLength(8);
      expect((await fetch(`${base}/api/admin`, { headers })).status).toBe(200);
      let updated = await db.user.findUniqueOrThrow({ where: { id: userId } });
      expect(updated.totpCipher).not.toContain(config.secret);
      expect(await verifySecondFactor(updated, result.recoveryCodes[0])).toBe(
        true,
      );
      updated = await db.user.findUniqueOrThrow({ where: { id: userId } });
      expect(await verifySecondFactor(updated, result.recoveryCodes[0])).toBe(
        false,
      );
      expect(await verifySecondFactor(updated, code)).toBe(true);
      updated = await db.user.findUniqueOrThrow({ where: { id: userId } });
      expect(await verifySecondFactor(updated, code)).toBe(false);
      await db.user.update({
        where: { id: userId },
        data: { role: 'CUSTOMER' },
      });
    },
  );
  it.skipIf(!process.env.TEST_BASE_URL)(
    'preserves the payment QR and unrelated settings when saving the admin form',
    async () => {
      const original = await db.setting.findUniqueOrThrow({
        where: { key: 'store' },
      });
      const settings = original.value as Prisma.JsonObject;
      const sentinel = `qr-regression-${tag}`;
      await db.user.update({ where: { id: userId }, data: { role: 'ADMIN' } });
      try {
        await db.setting.update({
          where: { key: 'store' },
          data: { value: { ...settings, paymentQrFileId: sentinel } },
        });
        const response = await fetch(`${process.env.TEST_BASE_URL}/api/admin`, {
          method: 'POST',
          headers: {
            Cookie: `tm_session=${adminToken}`,
            Origin: process.env.APP_URL!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'settings',
            settings: {
              exchangeRate: 7.1,
              localShipping: 1500,
              provinceShipping: 3000,
              riskThreshold: 60,
              phoneThreshold: 100000,
              whatsapp: '',
              bankDetails: 'Test-only account',
            },
          }),
        });
        expect(response.status).toBe(200);
        expect(
          (await db.setting.findUniqueOrThrow({ where: { key: 'store' } }))
            .value,
        ).toMatchObject({
          paymentQrFileId: sentinel,
          exchangeRate: 7.1,
          name: settings.name,
        });
      } finally {
        await db.setting.update({
          where: { key: 'store' },
          data: { value: settings },
        });
        await db.user.update({
          where: { id: userId },
          data: { role: 'CUSTOMER' },
        });
      }
    },
  );
  it('rejects unverified buyers for digital inventory', async () => {
    await db.user.update({ where: { id: userId }, data: { verifiedAt: null } });
    await expect(makeOrder('DIGITAL')).rejects.toThrow('Verifica tu correo');
    await db.user.update({
      where: { id: userId },
      data: { verifiedAt: new Date() },
    });
  });
  it.skipIf(!process.env.TEST_BASE_URL)(
    'prevents IDOR and customer admin access through live HTTP endpoints',
    async () => {
      const base = process.env.TEST_BASE_URL;
      if (!base) return;
      const token = randomBytes(32).toString('base64url');
      tokens.push(token);
      await db.session.create({
        data: {
          tokenHash: hash(token),
          userId: otherId,
          expiresAt: new Date(Date.now() + 60000),
        },
      });
      const code = await db.digitalCode.findFirstOrThrow({
        where: { provider: tag, status: 'DELIVERED' },
      });
      const reveal = await fetch(`${base}/api/codes/${code.id}/reveal`, {
        method: 'POST',
        headers: {
          Cookie: `tm_session=${token}`,
          Origin: process.env.APP_URL!,
          'Content-Type': 'application/json',
        },
        body: '{}',
      });
      expect(reveal.status).toBe(404);
      const admin = await fetch(`${base}/api/admin`, {
        headers: { Cookie: `tm_session=${token}` },
      });
      expect(admin.status).toBe(403);
      const orders = await fetch(`${base}/api/orders`, {
        headers: { Cookie: `tm_session=${token}` },
      });
      expect(await orders.json()).toEqual([]);
      const csrf = await fetch(`${base}/api/auth`, {
        method: 'POST',
        headers: {
          Origin: 'https://attacker.invalid',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'logout' }),
      });
      expect(csrf.status).toBe(403);
      const pending = await makeOrder('PHYSICAL');
      const png = await sharp({
        create: {
          width: 1800,
          height: 1000,
          channels: 3,
          background: '#3455f5',
        },
      })
        .png()
        .toBuffer();
      const form = (bytes: Uint8Array) => {
        const body = new FormData();
        body.set('orderId', pending.id);
        body.set(
          'file',
          new Blob([new Uint8Array(bytes)], { type: 'image/png' }),
          'receipt.png',
        );
        return body;
      };
      const ownerHeaders = {
        Cookie: `tm_session=${adminToken}`,
        Origin: process.env.APP_URL!,
      };
      const spoofed = await fetch(`${base}/api/files`, {
        method: 'POST',
        headers: ownerHeaders,
        body: form(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')),
      });
      expect(spoofed.status).toBe(400);
      const upload = await fetch(`${base}/api/files`, {
        method: 'POST',
        headers: ownerHeaders,
        body: form(png),
      });
      expect(upload.status).toBe(201);
      const uploaded = await upload.json();
      const record = await db.storedFile.findUniqueOrThrow({
        where: { id: uploaded.id },
      });
      expect(record.mime).toBe('image/webp');
      const metadata = await sharp(await storage.read(record.path)).metadata();
      expect(metadata.width).toBeLessThanOrEqual(1600);
      expect(metadata.exif).toBeUndefined();
      const ownFile = await fetch(`${base}/api/files/${uploaded.id}`, {
        headers: ownerHeaders,
      });
      expect(ownFile.status).toBe(200);
      expect(ownFile.headers.get('cache-control')).toContain('no-store');
      const otherFile = await fetch(`${base}/api/files/${uploaded.id}`, {
        headers: { Cookie: `tm_session=${token}` },
      });
      expect(otherFile.status).toBe(404);
    },
  );
});
