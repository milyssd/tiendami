import { describe, it, expect } from 'vitest';
import { calculate, riskScore, dollars } from '../lib/server/pricing';
describe('server pricing', () => {
  it('calculates mixed totals in integer centavos', () => {
    expect(
      calculate(
        [
          { price: 34900, quantity: 2, type: 'PHYSICAL' },
          { price: 15900, quantity: 1, type: 'DIGITAL' },
        ],
        1500,
        { percent: 10, type: 'DIGITAL' },
      ),
    ).toEqual({
      subtotal: 85700,
      shipping: 1500,
      discount: 1590,
      total: 85610,
    });
  });
  it('never adds shipping to digital-only orders', () => {
    expect(
      calculate([{ price: 10000, quantity: 1, type: 'COURSE' }], 9999).shipping,
    ).toBe(0);
  });
  it('caps fixed discount at eligible subtotal', () => {
    expect(
      calculate(
        [
          { price: 500, quantity: 1, type: 'DIGITAL' },
          { price: 5000, quantity: 1, type: 'PHYSICAL' },
        ],
        0,
        { amount: 5000, type: 'DIGITAL' },
      ).discount,
    ).toBe(500);
  });
  it('rejects fractions, negative prices, zero quantity', () => {
    for (const price of [-1, 2.5])
      expect(() =>
        calculate([{ price, quantity: 1, type: 'PHYSICAL' }], 0),
      ).toThrow();
    expect(() =>
      calculate([{ price: 100, quantity: 0, type: 'PHYSICAL' }], 0),
    ).toThrow();
  });
  it('uses configurable FX and rejects invalid rates', () => {
    expect(dollars(69600, 6.96)).toBe(10000);
    expect(dollars(69600, 8)).toBe(8700);
    expect(() => dollars(100, 0)).toThrow();
  });
  it('flags high-value orders from young unverified accounts', () => {
    expect(
      riskScore({
        total: 150000,
        accountAgeDays: 0,
        recentOrders: 5,
        verifiedPhone: false,
        email: 'x@mailinator.com',
      }),
    ).toBe(100);
    expect(
      riskScore({
        total: 10000,
        accountAgeDays: 30,
        recentOrders: 0,
        verifiedPhone: true,
        email: 'x@example.com',
      }),
    ).toBe(0);
  });
});
