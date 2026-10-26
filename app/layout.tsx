import type { Metadata } from 'next';
import '@fontsource/barlow/latin-400.css';
import '@fontsource/barlow/latin-500.css';
import '@fontsource/barlow/latin-600.css';
import '@fontsource/barlow/latin-700.css';
import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/barlow-condensed/latin-800.css';
import '@fontsource/barlow-condensed/latin-900.css';
import './globals.css';
import { StoreProvider } from '@/components/store';
import { Header, Cart, Footer, Cookies, Benefits } from '@/components/chrome';
import { db } from '@/lib/server/db';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? 'http://localhost:3000'),
  title: {
    default: 'TiendaMi Bolivia | Gaming, estilo y tu siguiente nivel',
    template: '%s | TiendaMi Bolivia',
  },
  description:
    'Descubre periféricos gaming, códigos digitales, perfumes, cursos y servicios web en Bolivia. Compra en bolivianos con atención local y pagos por QR.',
  openGraph: { locale: 'es_BO', type: 'website', siteName: 'TiendaMi' },
  twitter: { card: 'summary_large_image' },
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let rate = 6.96;
  try {
    const setting = await db.setting.findUnique({ where: { key: 'store' } });
    const value = setting?.value as { exchangeRate?: number } | null;
    rate = value?.exchangeRate ?? rate;
  } catch {}
  return (
    <html lang="es-BO">
      <body>
        <a className="skip-link" href="#contenido">
          Saltar al contenido
        </a>
        <StoreProvider exchangeRate={rate}>
          <Header />
          <div id="contenido">{children}</div>
          <Benefits />
          <Footer />
          <Cart />
          <Cookies />
        </StoreProvider>
      </body>
    </html>
  );
}
