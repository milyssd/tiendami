import { Catalog } from '@/components/shop';
import { catalog } from '@/lib/server/catalog';
export const metadata = {
  title: 'Tus favoritos',
  robots: { index: false, follow: false },
};
export default async function Page() {
  return <Catalog products={await catalog()} wishes />;
}
