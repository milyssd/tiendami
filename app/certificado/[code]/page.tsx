import { db } from '@/lib/server/db';
import { notFound } from 'next/navigation';
export const metadata = {
  title: 'Verificar certificado',
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const e = await db.enrollment.findUnique({
    where: { certificateCode: code },
    include: { course: { include: { product: true } } },
  });
  if (!e) notFound();
  return (
    <main className="shell empty-state">
      <span className="eyebrow">TIENDAMI ACADEMY</span>
      <h1>CERTIFICADO VÁLIDO.</h1>
      <p>
        Se completó el curso «{e.course.product.name}». Por privacidad, el
        nombre del titular solo aparece en su certificado descargado.
      </p>
      <code>{e.certificateCode}</code>
    </main>
  );
}
