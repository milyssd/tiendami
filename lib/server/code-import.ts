import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import { hash } from './crypto';
const rowSchema = z.object({
  code: z
    .string()
    .trim()
    .min(8)
    .max(200)
    .regex(/^[A-Za-z0-9-]+$/),
  provider: z.string().trim().min(1).max(100),
  cost: z.coerce.number().nonnegative().max(1000000),
  expiresAt: z.string().optional().default(''),
});
export function parseCodes(csv: string) {
  if (Buffer.byteLength(csv) > 512000) throw new Error('CSV too large');
  const raw = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    max_record_size: 1000,
  }) as Record<string, string>[];
  if (!raw.length || raw.length > 500) throw new Error('Use 1 to 500 rows');
  const seen = new Set<string>();
  const errors: { row: number; error: string }[] = [];
  const rows: {
    code: string;
    provider: string;
    cost: number;
    expiresAt: Date | null;
    fingerprint: string;
  }[] = [];
  for (const [i, r] of raw.entries()) {
    const parsed = rowSchema.safeParse(r);
    if (!parsed.success) {
      errors.push({
        row: i + 2,
        error: 'Formato inválido: code, provider, cost, expiresAt.',
      });
      continue;
    }
    const d = parsed.data;
    const fingerprint = hash(d.code.toUpperCase());
    if (seen.has(fingerprint)) {
      errors.push({ row: i + 2, error: 'Código duplicado en el archivo.' });
      continue;
    }
    seen.add(fingerprint);
    const expiresAt = d.expiresAt ? new Date(d.expiresAt) : null;
    if (
      expiresAt &&
      (!Number.isFinite(expiresAt.getTime()) || expiresAt < new Date())
    ) {
      errors.push({
        row: i + 2,
        error: 'Fecha de vencimiento inválida o pasada.',
      });
      continue;
    }
    rows.push({
      code: d.code,
      provider: d.provider,
      cost: Math.round(d.cost * 100),
      expiresAt,
      fingerprint,
    });
  }
  return { rows, errors };
}
