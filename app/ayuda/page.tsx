import Link from 'next/link';
export const metadata = {
  title: 'Ayuda y guía de canje de códigos digitales en Bolivia',
  description:
    'Resuelve tus dudas sobre pagos por QR, envíos en Bolivia, canje de códigos, acceso a cursos y servicios web. Encuentra ayuda para tus compras en TiendaMi.',
  alternates: { canonical: '/ayuda' },
};
const faqs = [
  [
    '¿Cómo pago mi pedido?',
    'Crea tu pedido y elige QR o transferencia. Los datos de pago se muestran en Mi cuenta. Sube una imagen del comprobante; verificamos el abono antes de habilitar la entrega. No se acepta una imagen como prueba automática de pago.',
  ],
  [
    '¿Cuánto dura la reserva?',
    'Reservamos los productos y códigos durante 2 horas. Si no se confirma el pago, se libera la reserva. No transfieras a una reserva vencida sin coordinar antes con la tienda.',
  ],
  [
    '¿Puedo mezclar productos físicos y digitales?',
    'Sí. Cada artículo tiene su propio estado. Solo solicitamos dirección y calculamos envío cuando el pedido incluye físicos.',
  ],
  [
    '¿Cómo recibo un código digital?',
    'Desde Mi cuenta, verifica tu correo. Después de confirmar el pago y la revisión de seguridad, ve a Mis compras y pulsa Revelar mi código. No necesitas entregar tus credenciales de Steam, Epic u otra plataforma.',
  ],
  [
    '¿Dónde encuentro mis cursos y archivos?',
    'En Mi cuenta, entra a Mis cursos o Mis compras. El acceso y las descargas se habilitan después de confirmar el pago.',
  ],
  [
    '¿Cómo solicito soporte?',
    'En Mi cuenta, abre la pestaña Soporte. Describe el problema y selecciona el pedido relacionado. Nunca publiques tu código digital en redes ni en una reseña.',
  ],
];
export default function Page() {
  return (
    <main className="shell legal-page">
      <div className="breadcrumb">
        <Link href="/">Inicio</Link>
        <span>/</span>
        <span>Ayuda</span>
      </div>
      <span className="eyebrow">SIN COMPLICARTE LA PARTIDA</span>
      <h1>
        TE DAMOS UNA MANO<span className="dot">.</span>
      </h1>
      <div className="faq">
        {faqs.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
      <section id="canje">
        <h2>Guía de canje de códigos</h2>
        <p>
          Comprueba la plataforma y región en tu pedido. Entra tú mismo al sitio
          oficial de la plataforma, inicia sesión en tu cuenta y busca su opción
          de canjear código o tarjeta de regalo. Copia el código desde Mis
          compras y sigue las instrucciones oficiales. TiendaMi nunca te pedirá
          tu contraseña, PIN ni código de verificación. Si aparece un error,
          conserva una captura que no exponga el código completo y abre un
          ticket.
        </p>
      </section>
      <p style={{ marginTop: 25 }}>
        <Link href="/cuenta">Hablar con soporte desde mi cuenta ↗</Link>
      </p>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map(([name, text]) => ({
              '@type': 'Question',
              name,
              acceptedAnswer: { '@type': 'Answer', text },
            })),
          }).replace(/</g, '\u003c'),
        }}
      />
    </main>
  );
}
