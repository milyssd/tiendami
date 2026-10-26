'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  LogOut,
  Download,
  ShieldCheck,
  Send,
  ExternalLink,
} from 'lucide-react';
import { TwoFactor } from './two-factor';
import { money } from '@/lib/types';
import { useStore } from './store';
type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  verified: boolean;
  twoFactorEnabled: boolean;
  sessions: { id: string; createdAt: string; userAgent: string }[];
};
type Order = {
  id: string;
  number: string;
  status: string;
  total: number;
  createdAt: string;
  expiresAt: string;
  items: {
    id: string;
    productName: string;
    type: string;
    quantity: number;
    unitPrice: number;
    status: string;
    tracking: string | null;
    code: { id: string; status: string } | null;
    project: { id: string; stage: string } | null;
    enrollment: { id: string; courseId: string } | null;
    download: { id: string } | null;
  }[];
};
type Ticket = {
  id: string;
  subject: string;
  status: string;
  messages: { id: string; text: string; createdAt: string }[];
};
const labels: Record<string, string> = {
  PENDING: 'Pendiente de pago',
  PAID: 'Pago confirmado',
  REVIEW: 'En revisión',
  PROCESSING: 'En proceso',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Reembolsado',
  DELIVERED: 'Entregado',
  SHIPPED: 'Enviado',
};
async function json(url: string, body: unknown) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error ?? 'No se pudo completar la solicitud.');
  return d;
}
async function readAccountSnapshot() {
  const response = await fetch('/api/auth');
  if (response.status === 401) return null;
  if (!response.ok) throw new Error('No pudimos conectar con tu cuenta.');
  const user: User = await response.json();
  const [orders, tickets, payment] = await Promise.all([
    fetch('/api/orders'),
    fetch('/api/support'),
    fetch('/api/payment'),
  ]);
  const orderData: Order[] = orders.ok ? await orders.json() : [];
  const ticketData: Ticket[] = tickets.ok ? await tickets.json() : [];
  const paymentData: { bankDetails: string; hasQr: boolean } = payment.ok
    ? await payment.json()
    : { bankDetails: '', hasQr: false };
  return { user, orders: orderData, tickets: ticketData, payment: paymentData };
}
type AccountSnapshot = Awaited<ReturnType<typeof readAccountSnapshot>>;
export function Account({
  initialMode = 'login',
}: {
  initialMode?: 'login' | 'reset';
}) {
  const store = useStore();
  const [u, setU] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'login' | 'register' | 'recover' | 'reset'>(
    initialMode,
  );
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [bank, setBank] = useState('');
  const [hasQr, setHasQr] = useState(false);
  const [needsOtp, setNeedsOtp] = useState(false);
  const applySnapshot = useCallback((snapshot: AccountSnapshot) => {
    setU(snapshot?.user ?? null);
    setOrders(snapshot?.orders ?? []);
    setTickets(snapshot?.tickets ?? []);
    setBank(snapshot?.payment.bankDetails ?? '');
    setHasQr(snapshot?.payment.hasQr ?? false);
  }, []);
  async function load() {
    try {
      applySnapshot(await readAccountSnapshot());
    } catch {
      setError('No pudimos conectar con tu cuenta.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    readAccountSnapshot()
      .then((snapshot) => {
        if (active) {
          applySnapshot(snapshot);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError('No pudimos conectar con tu cuenta.');
          setLoading(false);
        }
      });
    const params = new URLSearchParams(window.location.search);
    if (params.get('verify')) {
      json('/api/auth', { action: 'verify', token: params.get('verify') })
        .then(() => {
          if (active) {
            setMessage(
              'Correo verificado. Ya puedes comprar códigos digitales.',
            );
            window.history.replaceState({}, '', '/cuenta');
          }
          return readAccountSnapshot();
        })
        .then((snapshot) => {
          if (active) applySnapshot(snapshot);
        })
        .catch((error) => {
          if (active) setError(error.message);
        });
    }
    return () => {
      active = false;
    };
  }, [applySnapshot]);
  async function auth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    const f = new FormData(e.currentTarget);
    try {
      const d = await json('/api/auth', {
        action: mode,
        email: mode === 'reset' ? undefined : String(f.get('email')),
        password: ['login', 'register', 'reset'].includes(mode)
          ? String(f.get('password'))
          : undefined,
        name: mode === 'register' ? String(f.get('name')) : undefined,
        otp: needsOtp ? String(f.get('otp')) : undefined,
        token:
          mode === 'reset'
            ? new URLSearchParams(window.location.search).get('reset')
            : undefined,
      });
      if (d.requiresTotp) {
        setNeedsOtp(true);
        setMessage(
          'Introduce el código de tu autenticador o un código de recuperación.',
        );
        return;
      }
      if (mode === 'recover') {
        setMessage(d.message);
        return;
      }
      if (mode === 'reset') {
        setMessage('Contraseña actualizada. Inicia sesión.');
        setMode('login');
        window.history.replaceState({}, '', '/cuenta');
        return;
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al continuar.');
    } finally {
      setBusy(false);
    }
  }
  async function reveal(id: string) {
    if (
      !confirm(
        'Al revelar un código aceptas que no es reembolsable salvo defecto verificado. ¿Continuar?',
      )
    )
      return;
    try {
      const d = await json(`/api/codes/${id}/reveal`, {});
      setRevealed({ ...revealed, [id]: d.code });
    } catch (e) {
      store.notify((e as Error).message);
    }
  }
  async function upload(
    e: React.ChangeEvent<HTMLInputElement>,
    orderId: string,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.set('file', file);
    form.set('orderId', orderId);
    try {
      const r = await fetch('/api/files', { method: 'POST', body: form });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      store.notify('Comprobante recibido. Revisaremos tu pago.');
    } catch (e) {
      store.notify((e as Error).message);
    }
  }
  if (loading)
    return (
      <main className="shell empty-state">
        <h1>CARGANDO TU UNIVERSO…</h1>
      </main>
    );
  if (!u)
    return (
      <main className="shell">
        <div className="auth-layout">
          <span className="eyebrow">TU UNIVERSO TIENDAMI</span>
          <h1 className="page-title">
            ¡QUÉ BUENO VERTE!<span className="dot">.</span>
          </h1>
          <p className="page-subtitle">
            Tus picks, tus cursos y tus proyectos, en un solo lugar.
          </p>
          <div className="panel">
            <div className="auth-tabs">
              <button
                className={mode === 'login' ? 'selected' : ''}
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
              >
                Ya tengo cuenta
              </button>
              <button
                className={mode === 'register' ? 'selected' : ''}
                onClick={() => {
                  setMode('register');
                  setError('');
                }}
              >
                Soy nuevo por aquí
              </button>
            </div>
            <form className="form-stack" onSubmit={auth}>
              {mode === 'register' && (
                <label className="field-label">
                  Tu nombre
                  <input
                    name="name"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={100}
                  />
                </label>
              )}
              {mode !== 'reset' && (
                <label className="field-label">
                  Correo electrónico
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                  />
                </label>
              )}
              {mode !== 'recover' && (
                <label className="field-label">
                  Contraseña
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={12}
                    maxLength={128}
                    autoComplete={
                      mode === 'login' ? 'current-password' : 'new-password'
                    }
                    placeholder="Al menos 12 caracteres"
                  />
                </label>
              )}
              {needsOtp && (
                <label className="field-label">
                  Segundo factor o código de recuperación
                  <input
                    name="otp"
                    autoComplete="one-time-code"
                    required
                    minLength={6}
                    maxLength={30}
                  />
                </label>
              )}
              {mode === 'register' && (
                <label className="checkbox">
                  <input type="checkbox" required />
                  <span>
                    Acepto los <Link href="/legal/terminos">términos</Link> y la{' '}
                    <Link href="/legal/privacidad">política de privacidad</Link>
                    .
                  </span>
                </label>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              {message && (
                <p className="form-success" role="status">
                  {message}
                </p>
              )}
              <button className="button blue full" disabled={busy}>
                {busy
                  ? 'Un momento…'
                  : mode === 'register'
                    ? 'Crear mi cuenta'
                    : mode === 'recover'
                      ? 'Enviar enlace'
                      : mode === 'reset'
                        ? 'Guardar contraseña'
                        : 'Entrar a mi cuenta'}
                <ArrowRight size={17} />
              </button>
              {mode === 'login' && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setMode('recover')}
                >
                  Olvidé mi contraseña
                </button>
              )}
            </form>
          </div>
        </div>
      </main>
    );
  const displayed = orders
    .map((o) => ({
      ...o,
      items: o.items.filter((i) =>
        tab === 'codes'
          ? ['DIGITAL', 'DOWNLOAD'].includes(i.type)
          : tab === 'courses'
            ? i.type === 'COURSE'
            : tab === 'projects'
              ? i.type === 'SERVICE'
              : true,
      ),
    }))
    .filter((o) => o.items.length);
  return (
    <main className="shell account-page">
      <div className="account-toolbar">
        <div>
          <span className="eyebrow">TU UNIVERSO TIENDAMI</span>
          <h1>
            HOLA, {u.name.split(' ')[0].toUpperCase()}
            <span className="dot">.</span>
          </h1>
        </div>
        <button
          className="button paper"
          onClick={async () => {
            await json('/api/auth', { action: 'logout' });
            setU(null);
            setOrders([]);
            setRevealed({});
          }}
        >
          <LogOut size={15} />
          Salir
        </button>
      </div>
      {!u.verified && (
        <div className="form-error">
          <strong>Tu correo todavía no está verificado.</strong> Es necesario
          para comprar y revelar códigos digitales.{' '}
          <button
            className="underlined-link"
            onClick={async () => {
              try {
                await json('/api/auth', { action: 'send-verification' });
                store.notify('Revisa tu correo para verificar tu cuenta.');
              } catch (e) {
                store.notify((e as Error).message);
              }
            }}
          >
            Enviar verificación ↗
          </button>
        </div>
      )}
      {u.role === 'ADMIN' && !u.twoFactorEnabled && (
        <p className="form-error">
          Para entrar a administración, configura tu autenticador en{' '}
          <button
            className="underlined-link"
            onClick={() => setTab('settings')}
          >
            Mi cuenta → Segundo factor
          </button>
          .
        </p>
      )}
      {u.role !== 'CUSTOMER' && (
        <Link
          href="/admin"
          className="button blue"
          style={{ marginBottom: 20 }}
        >
          Ir a administración <ExternalLink size={16} />
        </Link>
      )}
      <div className="account-tabs">
        {[
          ['orders', 'Mis pedidos'],
          ['codes', 'Mis compras'],
          ['courses', 'Mis cursos'],
          ['projects', 'Mis proyectos'],
          ['support', 'Soporte'],
          ['settings', 'Mi cuenta'],
        ].map(([id, name]) => (
          <button
            key={id}
            className={tab === id ? 'selected' : ''}
            onClick={() => setTab(id)}
          >
            {name}
          </button>
        ))}
        <Link className="button paper" href="/favoritos">
          Favoritos ↗
        </Link>
      </div>
      {['orders', 'codes', 'courses', 'projects'].includes(tab) &&
        (displayed.length ? (
          displayed.map((o) => (
            <article className="order-card" key={o.id}>
              <div className="order-top">
                <div>
                  <strong>{o.number}</strong>
                  <small>
                    {new Date(o.createdAt).toLocaleDateString('es-BO')}
                  </small>
                </div>
                <span className="status-pill">
                  {labels[o.status] ?? o.status}
                </span>
              </div>
              {o.items.map((i) => (
                <div key={i.id}>
                  <div className="order-item">
                    <div>
                      <h3>{i.productName}</h3>
                      <small>
                        {i.quantity} × {money(i.unitPrice)} ·{' '}
                        {labels[i.status] ?? i.status}
                      </small>
                      {i.tracking && (
                        <p className="fine-print">
                          Guía de envío: {i.tracking}
                        </p>
                      )}
                      {i.project && (
                        <p className="fine-print">Etapa: {i.project.stage}</p>
                      )}
                    </div>
                    <div>
                      {i.code?.status === 'DELIVERED' && (
                        <button
                          className="button paper"
                          onClick={() => reveal(i.code!.id)}
                        >
                          Revelar mi código
                        </button>
                      )}
                      {i.enrollment && (
                        <Link
                          href={`/aula/${i.enrollment.id}`}
                          className="button paper"
                        >
                          Entrar al curso ↗
                        </Link>
                      )}
                      {i.download && (
                        <a
                          className="button paper"
                          href={`/api/downloads/${i.download.id}`}
                        >
                          <Download size={14} />
                          Descargar
                        </a>
                      )}
                      {i.project && (
                        <Link
                          className="button paper"
                          href={`/proyecto/${i.project.id}`}
                        >
                          Ver proyecto ↗
                        </Link>
                      )}
                    </div>
                  </div>
                  {i.code && revealed[i.code.id] && (
                    <code className="revealed-code">{revealed[i.code.id]}</code>
                  )}
                </div>
              ))}
              <div className="order-bottom">
                <div>
                  {['PENDING', 'REVIEW'].includes(o.status) ? (
                    <label className="button paper">
                      Subir comprobante
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        hidden
                        onChange={(e) => void upload(e, o.id)}
                      />
                    </label>
                  ) : (
                    !['CANCELLED', 'REFUNDED'].includes(o.status) && (
                      <a
                        className="underlined-link"
                        href={`/api/orders/${o.id}/receipt`}
                      >
                        Descargar recibo <Download size={14} />
                      </a>
                    )
                  )}
                </div>
                <strong>{money(o.total)}</strong>
              </div>
              {['PENDING', 'REVIEW'].includes(o.status) && (
                <div className="fine-print">
                  <p>
                    {o.status === 'REVIEW'
                      ? 'Pago recibido. Conservamos tu reserva mientras revisamos el pedido.'
                      : `Reserva hasta ${new Date(o.expiresAt).toLocaleString('es-BO')}.`}
                  </p>
                  <p>
                    {bank && !bank.startsWith('Configura')
                      ? bank
                      : 'Los datos de pago todavía no están disponibles. Consulta a soporte antes de transferir.'}
                  </p>
                  {hasQr && (
                    <a
                      className="underlined-link"
                      href="/api/payment/qr"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver QR de pago ↗
                    </a>
                  )}
                </div>
              )}
            </article>
          ))
        ) : (
          <div className="empty-state">
            <h2>TU PRÓXIMA HISTORIA EMPIEZA AQUÍ.</h2>
            <p>Todavía no tienes compras en esta sección.</p>
            <Link href="/catalogo" className="button blue">
              Encontrar mi próximo pick <ArrowRight size={16} />
            </Link>
          </div>
        ))}
      {tab === 'support' && (
        <>
          <section className="panel">
            <h2>TE DAMOS UNA MANO.</h2>
            <form
              className="form-stack"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const f = new FormData(form);
                try {
                  await json('/api/support', {
                    subject: f.get('subject'),
                    text: f.get('text'),
                    orderId: f.get('orderId') || undefined,
                  });
                  store.notify('Ticket creado. Te responderemos por aquí.');
                  form.reset();
                  await load();
                } catch (e) {
                  store.notify((e as Error).message);
                }
              }}
            >
              <label className="field-label">
                Asunto
                <input name="subject" required minLength={3} maxLength={150} />
              </label>
              <label className="field-label">
                Pedido (opcional)
                <select name="orderId">
                  <option value="">Consulta general</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.number}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                Cuéntanos qué pasó
                <textarea name="text" required minLength={5} maxLength={3000} />
              </label>
              <button className="button blue">
                Enviar consulta <Send size={16} />
              </button>
            </form>
          </section>
          {tickets.map((t) => (
            <article className="order-card" key={t.id}>
              <h3>
                {t.subject} <span className="status-pill">{t.status}</span>
              </h3>
              {t.messages.map((m) => (
                <p className="fine-print" key={m.id}>
                  {m.text}
                </p>
              ))}
            </article>
          ))}
        </>
      )}
      {tab === 'settings' && (
        <section className="panel">
          <h2>TU CUENTA, BAJO CONTROL.</h2>
          <p>
            {u.name} · {u.email}
          </p>
          <p className="fine-print">
            <ShieldCheck size={15} />
            Correo {u.verified ? 'verificado' : 'pendiente de verificación'}.
          </p>
          <h3>Sesiones activas</h3>
          {u.sessions.map((ss) => (
            <div className="spec-row" key={ss.id}>
              <span>{ss.userAgent.slice(0, 90)}</span>
              <small>
                {new Date(ss.createdAt).toLocaleDateString('es-BO')}
              </small>
            </div>
          ))}
          <button
            className="button paper"
            style={{ marginTop: 20 }}
            onClick={async () => {
              await json('/api/auth', { action: 'logout-all' });
              setU(null);
            }}
          >
            Cerrar sesión en todos los dispositivos
          </button>
          <TwoFactor
            enabled={u.twoFactorEnabled}
            onEnabled={() => void load()}
          />
        </section>
      )}
    </main>
  );
}
