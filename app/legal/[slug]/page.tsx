import { notFound } from 'next/navigation';
import Link from 'next/link';
import { legal } from '@/lib/legal';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = legal[slug];
  return {
    title: p?.title ?? 'Información legal',
    description: p
      ? `${p.title} de TiendaMi Bolivia. Conoce cómo se gestionan tus compras, tus datos y las condiciones de los productos y servicios de nuestra tienda.`
      : 'Información legal de TiendaMi',
    alternates: { canonical: `/legal/${slug}` },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = legal[slug];
  if (!p) notFound();
  return (
    <main className="shell legal-page">
      <div className="breadcrumb">
        <Link href="/">Inicio</Link>
        <span>/</span>
        <span>Información de la tienda</span>
      </div>
      <span className="eyebrow">LAS COSAS CLARAS</span>
      <h1>
        {p.title}
        <span className="dot">.</span>
      </h1>
      <p className="form-error">
        Documento de ejemplo pendiente de revisión y datos del titular antes de
        operar comercialmente.
      </p>
      {p.sections.map((s) => (
        <section key={s.title}>
          <h2>{s.title}</h2>
          <p>{s.text}</p>
        </section>
      ))}
      <p style={{ marginTop: 30 }}>
        <Link href="/cuenta">
          ¿Necesitas ayuda? Abre un ticket desde tu cuenta ↗
        </Link>
      </p>
    </main>
  );
}
