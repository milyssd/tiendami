import { Checkout } from '@/components/checkout';
export const metadata = {
  title: 'Finalizar pedido',
  robots: { index: false, follow: false },
};
export default function Page() {
  return <Checkout />;
}
