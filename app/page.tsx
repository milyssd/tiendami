import { Home } from '@/components/shop';
import { catalog } from '@/lib/server/catalog';
export default async function Page() {
  const products = await catalog();
  return (
    <main>
      <Home products={products} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'TiendaMi',
            url: process.env.APP_URL ?? 'http://localhost:3000',
            areaServed: 'BO',
          }).replace(/</g, '\u003c'),
        }}
      />
    </main>
  );
}
