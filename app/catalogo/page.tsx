import { Catalog } from '@/components/shop';
import { catalog } from '@/lib/server/catalog';
export const metadata = {
  title: 'Catálogo de gaming, perfumes, cursos y códigos digitales',
  description:
    'Explora nuestra selección de periféricos, perfumes, cursos y códigos digitales en Bolivia. Filtra por categoría, precio y disponibilidad y encuentra tu pick.',
  alternates: { canonical: '/catalogo' },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; q?: string; ofertas?: string }>;
}) {
  const query = await searchParams;
  return (
    <Catalog
      key={`${query.categoria ?? 'todos'}:${query.q ?? ''}:${query.ofertas ?? ''}`}
      products={await catalog()}
      initialCategory={query.categoria}
      query={query.q}
      offers={query.ofertas === '1'}
    />
  );
}
