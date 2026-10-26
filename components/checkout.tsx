'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useStore } from './store';
import { money } from '@/lib/types';
type Quote = {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  bankDetails: string;
  hasQr: boolean;
};
export function Checkout() {
  const s = useStore();
  const [shipping, setShipping] = useState('PICKUP');
  const [payment, setPayment] = useState('QR');
  const [coupon, setCoupon] = useState('');
  const [applied, setApplied] = useState('');
  const [quoteResult, setQuoteResult] = useState<{
    request: string;
    quote: Quote | null;
    error: string;
  } | null>(null);
  const [submitFailure, setSubmitFailure] = useState<{
    request: string | null;
    message: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ id: string; number: string } | null>(
    null,
  );
  const physical = s.lines.some((l) => l.type === 'PHYSICAL');
  const quoteRequest = s.lines.length
    ? JSON.stringify({
        items: s.lines.map((l) => ({
          variantId: l.variantId,
          quantity: l.quantity,
        })),
        shippingMethod: shipping,
        coupon: applied || undefined,
      })
    : null;
  // A result belongs to its exact cart/shipping/coupon request. A render for a
  // different request has no usable quote, even before the next effect starts.
  const currentResult =
    quoteResult?.request === quoteRequest ? quoteResult : null;
  const quote = currentResult?.quote ?? null;
  const error =
    (submitFailure?.request === quoteRequest ? submitFailure?.message : '') ||
    currentResult?.error ||
    '';
  useEffect(() => {
    if (!quoteRequest) return;
    let cancelled = false;
    const controller = new AbortController();
    fetch('/api/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: quoteRequest,
      signal: controller.signal,
    })
      .then(async (r) => {
        const data = await r.json();
        if (!cancelled) {
          setQuoteResult({
            request: quoteRequest,
            quote: r.ok ? data : null,
            error: r.ok ? '' : data.error,
          });
        }
      })
      .catch((failure) => {
        if (failure.name !== 'AbortError' && !cancelled) {
          setQuoteResult({
            request: quoteRequest,
            quote: null,
            error: 'No pudimos calcular el total. Revisa tu conexión.',
          });
        }
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [quoteRequest]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!quote || busy) return;
    setBusy(true);
    setSubmitFailure(null);
    const data = new FormData(e.currentTarget);
    try {
      const r = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: s.lines.map((l) => ({
            variantId: l.variantId,
            quantity: l.quantity,
          })),
          phone: String(data.get('phone')),
          paymentMethod: payment,
          shippingMethod: shipping,
          coupon: applied || undefined,
          address:
            physical && shipping !== 'PICKUP'
              ? {
                  city: String(data.get('city')),
                  line: String(data.get('address')),
                  reference: String(data.get('reference') ?? ''),
                }
              : undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setSubmitFailure({ request: quoteRequest, message: d.error });
        return;
      }
      setCreated(d);
      s.clear();
    } catch {
      setSubmitFailure({
        request: quoteRequest,
        message: 'No pudimos crear tu pedido. Inténtalo nuevamente.',
      });
    } finally {
      setBusy(false);
    }
  }
  if (created)
    return (
      <main className="shell empty-state">
        <CheckCircle2 size={54} />
        <span className="eyebrow">PEDIDO CREADO · PENDIENTE DE PAGO</span>
        <h1>
          ¡BUEN PICK!
          <br />
          YA RESERVAMOS LO TUYO.
        </h1>
        <p>
          Tu pedido <strong>{created.number}</strong> tiene una reserva de 2
          horas. El acceso o entrega se habilita después de confirmar tu pago.
        </p>
        <Link className="button blue" href="/cuenta">
          Ver instrucciones y subir comprobante <ArrowRight size={18} />
        </Link>
      </main>
    );
  return (
    <main className="shell">
      <div className="breadcrumb">
        <Link href="/">Inicio</Link>
        <span>/</span>
        <span>Finalizar pedido</span>
      </div>
      <span className="eyebrow">UN PASO MÁS HACIA TU SIGUIENTE NIVEL</span>
      <h1 className="page-title">
        HAGÁMOSLO TUYO<span className="dot">.</span>
      </h1>
      <p className="page-subtitle">
        Precios en bolivianos. Sin cargos escondidos.{' '}
        <Link className="underlined-link" href="/cuenta">
          Inicia sesión antes de comprar ↗
        </Link>
      </p>
      {!s.lines.length ? (
        <div className="empty-state">
          <h2>Tu carrito está esperando un buen pick.</h2>
          <Link href="/catalogo" className="button blue">
            Explorar el catálogo <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <form className="checkout-layout" onSubmit={submit}>
          <div>
            <section className="panel">
              <h2>01 / TUS DATOS</h2>
              <div className="form-grid">
                <label className="field-label wide">
                  Celular (WhatsApp)
                  <input
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+591 71234567"
                    required
                    pattern="\+?591[267][0-9]{7}"
                  />
                </label>
              </div>
              <p className="fine-print">
                Usamos el nombre y correo de tu cuenta. Los códigos digitales
                requieren correo verificado.
              </p>
            </section>
            {physical && (
              <section className="panel">
                <h2>02 / CÓMO TE LO HACEMOS LLEGAR</h2>
                {[
                  {
                    id: 'PICKUP',
                    name: 'Recojo en punto',
                    text: 'Sin costo. Coordinamos el lugar contigo.',
                  },
                  {
                    id: 'LOCAL',
                    name: 'Delivery local',
                    text: 'Solo dentro de la zona de cobertura de la tienda.',
                  },
                  {
                    id: 'PROVINCE',
                    name: 'Envío por encomienda',
                    text: 'Coordinamos transportista y punto de recojo.',
                  },
                ].map((x) => (
                  <label className="radio-card" key={x.id}>
                    <input
                      type="radio"
                      name="shipping"
                      value={x.id}
                      checked={shipping === x.id}
                      onChange={() => {
                        setShipping(x.id);
                        if (payment === 'CASH' && x.id !== 'LOCAL')
                          setPayment('QR');
                      }}
                    />
                    <span>
                      {x.name}
                      <small>{x.text}</small>
                    </span>
                  </label>
                ))}
                {shipping !== 'PICKUP' && (
                  <div className="form-grid" style={{ marginTop: 20 }}>
                    <label className="field-label">
                      Ciudad
                      <input
                        name="city"
                        autoComplete="address-level2"
                        required
                        maxLength={100}
                      />
                    </label>
                    <label className="field-label">
                      Dirección
                      <input
                        name="address"
                        autoComplete="street-address"
                        required
                        minLength={5}
                        maxLength={300}
                      />
                    </label>
                    <label className="field-label wide">
                      Referencia
                      <input name="reference" maxLength={300} />
                    </label>
                  </div>
                )}
              </section>
            )}
            <section className="panel">
              <h2>{physical ? '03' : '02'} / CÓMO PREFIERES PAGAR</h2>
              {[
                {
                  id: 'QR',
                  name: 'QR bancario',
                  text: 'Sube tu comprobante después de crear el pedido.',
                },
                {
                  id: 'TRANSFER',
                  name: 'Transferencia bancaria',
                  text: 'Los datos se muestran junto a tu pedido.',
                },
                ...(physical &&
                shipping === 'LOCAL' &&
                s.lines.every((l) => l.type === 'PHYSICAL')
                  ? [
                      {
                        id: 'CASH',
                        name: 'Contra entrega',
                        text: 'Solo para físicos con delivery local.',
                      },
                    ]
                  : []),
              ].map((x) => (
                <label className="radio-card" key={x.id}>
                  <input
                    type="radio"
                    name="payment"
                    value={x.id}
                    checked={payment === x.id}
                    onChange={() => setPayment(x.id)}
                  />
                  <span>
                    {x.name}
                    <small>{x.text}</small>
                  </span>
                </label>
              ))}
              <p className="fine-print">
                Confirmamos cada pago manualmente. Nunca envíes contraseñas, PIN
                ni acceso a tus cuentas.
              </p>
            </section>
          </div>
          <aside className="panel order-summary">
            <h2>TUS BUENOS PICKS</h2>
            {s.lines.map((l) => (
              <div className="summary-line" key={l.variantId}>
                <span>
                  {l.name}
                  <small>
                    {l.variant} · {l.quantity} unidad(es)
                  </small>
                </span>
                <button
                  type="button"
                  onClick={() => s.change(l.variantId, 0)}
                  aria-label={`Eliminar ${l.name}`}
                >
                  ×
                </button>
              </div>
            ))}
            <label className="field-label" style={{ marginTop: 20 }}>
              ¿Tienes un cupón?
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                  maxLength={40}
                />
                <button
                  type="button"
                  className="button paper"
                  onClick={() => setApplied(coupon)}
                >
                  Aplicar
                </button>
              </div>
            </label>
            {quote ? (
              <>
                <div className="summary-line">
                  <span>Subtotal</span>
                  <strong>{money(quote.subtotal)}</strong>
                </div>
                <div className="summary-line">
                  <span>Envío</span>
                  <strong>
                    {quote.shipping ? money(quote.shipping) : 'Sin costo'}
                  </strong>
                </div>
                {quote.discount > 0 && (
                  <div className="summary-line">
                    <span>Descuento</span>
                    <strong>−{money(quote.discount)}</strong>
                  </div>
                )}
                <div className="cart-total">
                  <span>Total en Bs</span>
                  <strong>{money(quote.total)}</strong>
                </div>
              </>
            ) : (
              <p className="fine-print">
                Calculando precio y disponibilidad en el servidor…
              </p>
            )}
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <label
              className="checkbox"
              style={{ alignItems: 'start', margin: '22px 0' }}
            >
              <input type="checkbox" required />
              <span>
                Acepto los{' '}
                <Link className="underlined-link" href="/legal/terminos">
                  términos de compra
                </Link>{' '}
                y las políticas aplicables a mis productos.
              </span>
            </label>
            <button className="button blue full" disabled={busy || !quote}>
              {busy ? 'Reservando…' : 'Crear pedido y reservar'}
              <ArrowRight size={18} />
            </button>
            <p className="fine-print" style={{ display: 'flex', gap: 7 }}>
              <ShieldCheck size={17} />
              El total se recalcula al confirmar. Reserva de 2 horas.
            </p>
          </aside>
        </form>
      )}
    </main>
  );
}
