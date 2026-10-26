import { notFound, redirect } from 'next/navigation';
import { session } from '@/lib/server/auth';
import { db } from '@/lib/server/db';
import { ProjectForms } from '@/components/project';
export const metadata = {
  title: 'Mi proyecto',
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = await session();
  if (
    !s ||
    (s.user.role === 'ADMIN' && (!s.user.totpEnabled || !s.twoFactorVerified))
  )
    redirect('/cuenta');
  const p = await db.project.findFirst({
    where: {
      id: id,
      ...(s.user.role === 'CUSTOMER' ? { userId: s.userId } : {}),
    },
    include: {
      orderItem: true,
      events: { orderBy: { createdAt: 'asc' } },
      milestones: true,
    },
  });
  if (!p) notFound();
  return (
    <main className="shell account-page">
      <span className="eyebrow" style={{ marginTop: 30 }}>
        LO ESTAMOS CONSTRUYENDO CONTIGO
      </span>
      <h1 className="page-title">{p.orderItem.productName}</h1>
      <div className="account-tabs">
        {['BRIEFING', 'DESIGN', 'DEVELOPMENT', 'REVIEW', 'DELIVERY'].map(
          (stage) => (
            <span
              className="status-pill"
              key={stage}
              style={{ opacity: p.stage === stage ? 1 : 0.45 }}
            >
              {stage}
            </span>
          ),
        )}
      </div>
      <p className="page-subtitle">
        Etapa actual: {p.stage}. Los cambios de alcance y pagos se acuerdan con
        la tienda.
      </p>
      {p.brief && (
        <section className="panel" style={{ marginBottom: 25 }}>
          <h2>TU BRIEF ACTUAL</h2>
          {Object.entries(p.brief as Record<string, string>).map(([k, v]) => (
            <p key={k} className="fine-print">
              <strong>{k}:</strong> {v}
            </p>
          ))}
        </section>
      )}
      <ProjectForms id={p.id} />
      <section className="panel" style={{ marginTop: 25 }}>
        <h2>HISTORIA DEL PROYECTO</h2>
        {p.events.map((e) => (
          <article className="review" key={e.id}>
            <small>{e.createdAt.toLocaleString('es-BO')}</small>
            <p>{e.text}</p>
          </article>
        ))}
        {!p.events.length && <p>Comparte tu brief para empezar.</p>}
      </section>
    </main>
  );
}
