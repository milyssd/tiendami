import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { readFile } from 'node:fs/promises';
import { db } from '../lib/server/db';
import { storage, optimizeImage } from '../lib/server/storage';
import { Prisma } from '@prisma/client';
async function main() {
  const path = process.argv[2];
  if (!path)
    throw new Error('Usage: npx tsx scripts/set-payment-qr.ts /path/qr.png');
  const result = await optimizeImage(await readFile(path));
  const stored = await storage.write(result.optimized, 'webp');
  const file = await db.storedFile.create({
    data: {
      ownerId: 'system',
      path: stored,
      mime: 'image/webp',
      bytes: result.optimized.length,
      originalBytes: result.originalBytes,
    },
  });
  await db.$transaction(
    async (tx) => {
      const setting = await tx.setting.findUnique({ where: { key: 'store' } });
      const config = (setting?.value ?? {}) as Prisma.JsonObject;
      await tx.setting.upsert({
        where: { key: 'store' },
        create: {
          key: 'store',
          value: { ...config, paymentQrFileId: file.id },
        },
        update: { value: { ...config, paymentQrFileId: file.id } },
      });
      await tx.auditLog.create({
        data: {
          actorId: 'local-operator',
          action: 'PAYMENT_QR_UPDATED',
          entityId: file.id,
          ipHash: 'local',
        },
      });
    },
    { isolationLevel: 'Serializable' },
  );
  console.info(
    'Payment QR updated. Verify beneficiary before taking payments.',
  );
}
main().finally(() => db.$disconnect());
