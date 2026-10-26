'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="shell empty-state">
      <span className="eyebrow">PAUSA TÉCNICA</span>
      <h1>ESTA PARTIDA NECESITA UN REINTENTO.</h1>
      <p>No pudimos cargar la información. Inténtalo de nuevo en un momento.</p>
      <button className="button blue" onClick={reset}>
        Volver a intentar
      </button>
    </main>
  );
}
