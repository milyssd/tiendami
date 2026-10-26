import { db } from './db';
import type { ProductCard } from '../types';
export async function catalog(): Promise<ProductCard[]> {
  const products = await db.product.findMany({
    where: { active: true },
    include: {
      category: true,
      brand: true,
      attributes: { include: { attribute: true } },
      variants: {
        orderBy: { price: 'asc' },
        include: {
          _count: {
            select: {
              codes: {
                where: {
                  status: 'AVAILABLE',
                  OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
                },
              },
            },
          },
        },
      },
      reviews: { where: { approved: true }, select: { rating: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  return products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    type: p.type,
    category: p.category.slug,
    categoryName: p.category.name,
    brand: p.brand?.name ?? 'TiendaMi',
    image: p.image,
    imageAlt: p.imageAlt,
    featured: p.featured,
    attributes: Object.fromEntries(
      p.attributes.map((a) => [a.attribute.name, a.value]),
    ),
    rating: p.reviews.length
      ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length
      : 0,
    reviewCount: p.reviews.length,
    variants: p.variants.map((v) => ({
      id: v.id,
      name: v.name,
      price: v.price,
      oldPrice: v.oldPrice,
      stock:
        p.type === 'DIGITAL'
          ? v._count.codes
          : p.type === 'PHYSICAL'
            ? v.stock
            : 999,
      platform: v.platform,
      region: v.region,
    })),
  }));
}
