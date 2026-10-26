export type Kind = 'PHYSICAL' | 'DIGITAL' | 'COURSE' | 'SERVICE' | 'DOWNLOAD';
export type ProductCard = {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: Kind;
  category: string;
  categoryName: string;
  brand: string;
  image: string;
  imageAlt: string;
  featured: boolean;
  attributes: Record<string, string>;
  rating: number;
  reviewCount: number;
  variants: {
    id: string;
    name: string;
    price: number;
    oldPrice: number | null;
    stock: number;
    platform: string | null;
    region: string | null;
  }[];
};
export const kindNames: Record<Kind, string> = {
  PHYSICAL: 'Producto físico',
  DIGITAL: 'Código digital',
  COURSE: 'Curso online',
  SERVICE: 'Servicio',
  DOWNLOAD: 'Descargable',
};
export const money = (cents: number, currency = 'BOB', rate = 6.96) =>
  new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'BOB' ? 0 : 2,
  })
    .format(currency === 'USD' ? cents / 100 / rate : cents / 100)
    .replace('BOB', 'Bs');
