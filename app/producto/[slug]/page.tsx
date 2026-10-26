import { notFound } from 'next/navigation';
import { catalog } from '@/lib/server/catalog';
import { db } from '@/lib/server/db';
import { Detail } from '@/components/detail';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await db.product.findUnique({ where: { slug } });
  return p
    ? {
        title: p.seoTitle ?? p.name,
        description: p.seoDescription ?? p.description.slice(0, 157),
        alternates: { canonical: `/producto/${p.slug}` },
        openGraph: { images: [p.image] },
      }
    : { title: 'Producto no encontrado' };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const products = await catalog();
  const p = products.find((p) => p.slug === slug);
  if (!p) notFound();
  const reviews = await db.review.findMany({
    where: { productId: p.id, approved: true },
    select: { text: true, rating: true, user: { select: { name: true } } },
    take: 20,
  });
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description,
    image: p.image,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'BOB',
      price: p.variants[0].price / 100,
      availability: `https://schema.org/${p.variants[0].stock ? 'InStock' : 'OutOfStock'}`,
    },
    ...(p.reviewCount
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: p.rating,
            reviewCount: p.reviewCount,
          },
        }
      : {}),
  };
  return (
    <>
      <Detail
        product={p}
        related={products
          .filter((r) => r.id !== p.id)
          .sort(
            (a, b) =>
              Number(b.category === p.category) -
              Number(a.category === p.category),
          )
          .slice(0, 4)}
        reviews={reviews.map((r) => ({
          name: r.user.name.split(' ')[0],
          rating: r.rating,
          text: r.text,
        }))}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, '\u003c'),
        }}
      />
    </>
  );
}
