import { authenticator } from 'otplib';
import { db } from './db';
import { decryptCode, hash } from './crypto';
import type { User } from '@prisma/client';
authenticator.options = { window: 1 };
export async function verifySecondFactor(user: User, otp: string) {
  if (!user.totpEnabled || !user.totpCipher || !user.totpKeyVersion)
    return false;
  if (/^[0-9]{6}$/.test(otp)) {
    const delta = authenticator.checkDelta(
      otp,
      decryptCode(user.totpCipher, user.totpKeyVersion),
    );
    if (delta === null) return false;
    const step = Math.floor(Date.now() / 30000) + delta;
    const claimed = await db.user.updateMany({
      where: {
        id: user.id,
        OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }],
      },
      data: { totpLastStep: step },
    });
    return claimed.count === 1;
  }
  const fingerprint = hash(otp.toUpperCase());
  const saved = user.recoveryHashes;
  if (!Array.isArray(saved) || !saved.includes(fingerprint)) return false;
  // Serialize consumption of a single-use recovery code with a conditional update.
  const claimed = await db.user.updateMany({
    where: { id: user.id, recoveryHashes: { equals: saved } },
    data: { recoveryHashes: saved.filter((x) => x !== fingerprint) },
  });
  return claimed.count === 1;
}
