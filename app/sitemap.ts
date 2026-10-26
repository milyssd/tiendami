import type { MetadataRoute } from 'next';
import { db } from '@/lib/server/db';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? 'http://localhost:3000';
  const products = await db.product.findMany({
    where: { active: true },
    select: { slug: true, createdAt: true },
  });
  return [
    '',
    '/catalogo',
    '/ayuda',
    '/legal/terminos',
    '/legal/privacidad',
    '/legal/cookies',
    '/legal/envios',
    '/legal/digitales',
    '/legal/servicios',
  ]
    .map((path) => ({
      url: base + path,
      changeFrequency: 'weekly' as const,
      priority: path ? 0.6 : 1,
    }))
    .concat(
      products.map((p) => ({
        url: `${base}/producto/${p.slug}`,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
    );
}
