import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { db } from '../lib/server/db';
import { expireOrders } from '../lib/server/orders';
async function tick() {
  try {
    const count = await expireOrders();
    await db.rateLimit.deleteMany({ where: { resetAt: { lt: new Date() } } });
    await db.mediaSession.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (count) console.info(`Expired reservations: ${count}`);
  } catch {
    console.error('Reservation worker failed');
  }
}
void tick();
setInterval(() => void tick(), 60000);
