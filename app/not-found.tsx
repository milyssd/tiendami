import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="shell empty-state">
      <span className="error-code">404</span>
      <h1>ESTE NIVEL TODAVÍA NO EXISTE.</h1>
      <p>Pero tenemos muchos buenos picks esperándote.</p>
      <Link className="button blue" href="/catalogo">
        Volver al catálogo ↗
      </Link>
    </main>
  );
}
