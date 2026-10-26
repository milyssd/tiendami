import type { Kind } from '../types';
export type PriceLine = { price: number; quantity: number; type: Kind };
export function calculate(
  lines: PriceLine[],
  shipping: number,
  coupon?: {
    percent?: number | null;
    amount?: number | null;
    type?: Kind | null;
  },
) {
  if (
    !lines.length ||
    lines.some(
      (l) =>
        !Number.isSafeInteger(l.price) ||
        l.price < 0 ||
        !Number.isSafeInteger(l.quantity) ||
        l.quantity < 1 ||
        l.quantity > 10,
    ) ||
    !Number.isSafeInteger(shipping) ||
    shipping < 0
  )
    throw new Error('Invalid pricing input');
  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const eligible = lines
    .filter((l) => !coupon?.type || l.type === coupon.type)
    .reduce((s, l) => s + l.price * l.quantity, 0);
  const discount = Math.min(
    eligible,
    Math.max(
      0,
      coupon?.percent
        ? Math.floor((eligible * coupon.percent) / 100)
        : (coupon?.amount ?? 0),
    ),
  );
  const delivery = lines.some((l) => l.type === 'PHYSICAL') ? shipping : 0;
  return {
    subtotal,
    shipping: delivery,
    discount,
    total: subtotal + delivery - discount,
  };
}
export function riskScore(input: {
  total: number;
  accountAgeDays: number;
  recentOrders: number;
  verifiedPhone: boolean;
  email: string;
}) {
  return Math.min(
    100,
    (input.total > 100000 ? 30 : 0) +
      (input.accountAgeDays < 7 ? 20 : 0) +
      (input.recentOrders > 3 ? 35 : 0) +
      (!input.verifiedPhone && input.total > 50000 ? 20 : 0) +
      (/@(mailinator|tempmail|guerrillamail)\./i.test(input.email) ? 50 : 0),
  );
}
export function dollars(cents: number, rate: number) {
  if (!Number.isFinite(rate) || rate <= 0)
    throw new Error('Invalid exchange rate');
  return Math.round(cents / rate);
}
