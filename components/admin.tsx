'use client';
import { useEffect, useState } from 'react';
import { useStore } from './store';
import { money } from '@/lib/types';
import { Check, RefreshCw, Upload, Save } from 'lucide-react';
type Variant = {
  id: string;
  name: string;
  price: number;
  stock: number;
  _count: { codes: number };
};
type Data = {
  orders: {
    id: string;
    number: string;
    total: number;
    status: string;
    riskScore: number;
    createdAt: string;
    user: { name: string; email: string };
    items: {
      productName: string;
      quantity: number;
      type: string;
      status: string;
    }[];
    files: { id: string; bytes: number }[];
  }[];
  products: {
    id: string;
    name: string;
    type: string;
    active: boolean;
    variants: Variant[];
  }[];
  logs: {
    id: string;
    actorId: string;
    action: string;
    entityId: string;
    createdAt: string;
  }[];
  settings: {
    exchangeRate: number;
    localShipping: number;
    provinceShipping: number;
    riskThreshold: number;
    phoneThreshold: number;
    whatsapp: string;
    bankDetails: string;
  };
  users: {
    id: string;
    name: string;
    email: string;
    role: string;
    blocked: boolean;
  }[];
};
async function readAdminData(): Promise<Data> {
  const response = await fetch('/api/admin');
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error ?? 'No pudimos conectar con administración.');
  return data;
}
export function Admin() {
  const store = useStore();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('orders');
  const [preview, setPreview] = useState<{
    valid: number;
    errors: { row: number; error: string }[];
    preview: { row: number; provider: string; cost: number }[];
  } | null>(null);
  const [csv, setCsv] = useState('');
  const [variantId, setVariantId] = useState('');
  const [busy, setBusy] = useState(false);
  async function load() {
    setData(await readAdminData());
  }
  useEffect(() => {
    let active = true;
    readAdminData()
      .then((value) => {
        if (active) setData(value);
      })
      .catch((error) => {
        if (active)
          setError(
            error instanceof Error
              ? error.message
              : 'No pudimos conectar con administración.',
          );
      });
    return () => {
      active = false;
    };
  }, []);
  async function action(body: unknown, url = '/api/admin') {
    setBusy(true);
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      store.notify('Cambio guardado.');
      await load();
      return d;
    } catch (e) {
      store.notify((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return (
      <main className="shell empty-state">
        <h1>{error || 'CARGANDO EL CENTRO DE MANDO…'}</h1>
      </main>
    );
  return (
    <main className="shell account-page">
      <div className="account-toolbar">
        <div>
          <span className="eyebrow">TIENDAMI / ADMINISTRACIÓN</span>
          <h1>
            CENTRO DE MANDO<span className="dot">.</span>
          </h1>
        </div>
        <button className="button paper" onClick={() => void load()}>
          <RefreshCw size={15} />
          Actualizar
        </button>
      </div>
      <div className="dashboard-grid">
        <div className="stat">
          <span>Ventas confirmadas · últimos 100 pedidos</span>
          <strong>
            {money(
              data.orders
                .filter((o) =>
                  ['COMPLETED', 'PROCESSING', 'PAID'].includes(o.status),
                )
                .reduce((s, o) => s + o.total, 0),
            )}
          </strong>
        </div>
        <div className="stat">
          <span>Pendientes / en revisión</span>
          <strong>
            {
              data.orders.filter((o) =>
                ['PENDING', 'REVIEW'].includes(o.status),
              ).length
            }
          </strong>
        </div>
        <div className="stat">
          <span>Códigos disponibles</span>
          <strong>
            {data.products
              .flatMap((p) => p.variants)
              .reduce((s, v) => s + v._count.codes, 0)}
          </strong>
        </div>
      </div>
      <div className="account-tabs">
        {[
          ['orders', 'Pedidos'],
          ['products', 'Productos e inventario'],
          ['codes', 'Importar códigos'],
          ['users', 'Clientes'],
          ['settings', 'Configuración'],
          ['audit', 'Auditoría'],
        ].map(([id, name]) => (
          <button
            className={tab === id ? 'selected' : ''}
            onClick={() => setTab(id)}
            key={id}
          >
            {name}
          </button>
        ))}
      </div>
      {tab === 'orders' &&
        (data.orders.length ? (
          data.orders.map((o) => (
            <article className="order-card" key={o.id}>
              <div className="order-top">
                <div>
                  <strong>
                    {o.number} · {money(o.total)}
                  </strong>
                  <small>
                    {o.user.name} · {o.user.email}
                  </small>
                </div>
                <span className="status-pill">
                  {o.status} · Riesgo {o.riskScore}/100
                </span>
              </div>
              {o.items.map((i, n) => (
                <div className="summary-line" key={n}>
                  <span>
                    {i.quantity} × {i.productName}
                  </span>
                  <span>{i.status}</span>
                </div>
              ))}
              <div className="admin-actions">
                {o.files.map((f) => (
                  <a
                    className="button paper"
                    key={f.id}
                    href={`/api/files/${f.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Comprobante ({Math.round(f.bytes / 1024)} KB) ↗
                  </a>
                ))}
                {['PENDING', 'REVIEW'].includes(o.status) && (
                  <button
                    className="button blue"
                    disabled={busy}
                    onClick={() => {
                      if (
                        confirm(
                          `¿Confirmaste el abono de ${money(o.total)} en tu banco? Esta acción entrega los productos digitales.`,
                        )
                      )
                        void action({
                          action: 'confirm',
                          orderId: o.id,
                          approveRisk: o.status === 'REVIEW',
                        });
                    }}
                  >
                    <Check size={15} />
                    {o.status === 'REVIEW'
                      ? 'Aprobar riesgo y confirmar pago'
                      : 'Confirmar pago verificado'}
                  </button>
                )}
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state">
            <h2>TODAVÍA NO HAY PEDIDOS.</h2>
            <p>Los pedidos reales aparecerán aquí.</p>
          </div>
        ))}
      {tab === 'products' &&
        data.products.map((p) => (
          <section className="order-card" key={p.id}>
            <div className="order-top">
              <strong>
                {p.name}
                <small> · {p.type}</small>
              </strong>
              <button
                className="underlined-link"
                onClick={() =>
                  void action({
                    action: 'toggle-product',
                    productId: p.id,
                    active: !p.active,
                  })
                }
              >
                {p.active ? 'Ocultar producto' : 'Publicar producto'}
              </button>
            </div>
            {p.variants.map((v) => (
              <form
                className="form-grid"
                key={v.id}
                style={{ marginTop: 18 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void action({
                    action: 'stock',
                    variantId: v.id,
                    price: Math.round(Number(f.get('price')) * 100),
                    stock: Number(f.get('stock')),
                  });
                }}
              >
                <label className="field-label">
                  {v.name} · Precio en Bs
                  <input
                    name="price"
                    type="number"
                    min="0.01"
                    step="0.01"
                    defaultValue={v.price / 100}
                    required
                  />
                </label>
                <label className="field-label">
                  {p.type === 'DIGITAL'
                    ? `Códigos disponibles: ${v._count.codes}`
                    : 'Stock físico'}
                  <input
                    name="stock"
                    type="number"
                    min="0"
                    max="100000"
                    defaultValue={v.stock}
                    disabled={p.type !== 'PHYSICAL'}
                  />
                </label>
                <button className="button paper" disabled={busy}>
                  <Save size={14} />
                  Guardar variante
                </button>
              </form>
            ))}
          </section>
        ))}
      {tab === 'codes' && (
        <section className="panel">
          <h2>INVENTARIO QUE SOLO TÚ CONTROLAS.</h2>
          <p className="fine-print">
            CSV con columnas: code,provider,cost,expiresAt. Costo en Bs, fecha
            ISO opcional. Máximo 500 filas. Los códigos se cifran y no se
            muestran en la vista previa.
          </p>
          <div className="form-stack">
            <label className="field-label">
              Variante digital
              <select
                value={variantId}
                onChange={(e) => {
                  setVariantId(e.target.value);
                  setPreview(null);
                }}
              >
                <option value="">Selecciona un producto</option>
                {data.products
                  .filter((p) => p.type === 'DIGITAL')
                  .flatMap((p) =>
                    p.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {p.name} · {v.name}
                      </option>
                    )),
                  )}
              </select>
            </label>
            <label className="field-label">
              Importar archivo CSV
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 512000) {
                      store.notify('El archivo supera 500 KB.');
                      return;
                    }
                    setCsv(await file.text());
                    setPreview(null);
                  }
                }}
              />
            </label>
            <label className="field-label">
              Contenido del CSV
              <textarea
                value={csv}
                onChange={(e) => {
                  setCsv(e.target.value);
                  setPreview(null);
                }}
                placeholder="code,provider,cost,expiresAt"
                style={{ minHeight: 160 }}
                spellCheck={false}
              />
            </label>
            <button
              className="button paper"
              disabled={!variantId || !csv || busy}
              onClick={async () => {
                const d = await action(
                  { variantId, csv, commit: false },
                  '/api/admin/codes',
                );
                if (d) setPreview(d);
              }}
            >
              Validar y ver resumen
            </button>
            {preview && (
              <div>
                <p>
                  {preview.valid} códigos válidos. {preview.errors.length}{' '}
                  errores.
                </p>
                {preview.errors.map((e, i) => (
                  <p className="form-error" key={i}>
                    Fila {e.row || 'existente'}: {e.error}
                  </p>
                ))}
                {!preview.errors.length && (
                  <button
                    className="button blue"
                    disabled={busy}
                    onClick={async () => {
                      const d = await action(
                        { variantId, csv, commit: true },
                        '/api/admin/codes',
                      );
                      if (d) {
                        setCsv('');
                        setPreview(null);
                      }
                    }}
                  >
                    <Upload size={15} />
                    Importar {preview.valid} códigos cifrados
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      )}
      {tab === 'users' && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>
                    <button
                      className="underlined-link"
                      onClick={() =>
                        void action({
                          action: 'block',
                          userId: u.id,
                          blocked: !u.blocked,
                        })
                      }
                    >
                      {u.blocked ? 'Desbloquear' : 'Bloquear'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === 'settings' && (
        <section className="panel">
          <h2>LAS REGLAS DE TU TIENDA.</h2>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void action({
                action: 'settings',
                settings: {
                  exchangeRate: Number(f.get('exchangeRate')),
                  localShipping: Math.round(
                    Number(f.get('localShipping')) * 100,
                  ),
                  provinceShipping: Math.round(
                    Number(f.get('provinceShipping')) * 100,
                  ),
                  riskThreshold: Number(f.get('riskThreshold')),
                  phoneThreshold: Math.round(
                    Number(f.get('phoneThreshold')) * 100,
                  ),
                  whatsapp: String(f.get('whatsapp')),
                  bankDetails: String(f.get('bankDetails')),
                },
              });
            }}
          >
            <div className="form-grid">
              {[
                [
                  'exchangeRate',
                  'Tipo de cambio · Bs por USD',
                  data.settings.exchangeRate,
                ],
                [
                  'localShipping',
                  'Delivery local · Bs',
                  data.settings.localShipping / 100,
                ],
                [
                  'provinceShipping',
                  'Encomienda · Bs',
                  data.settings.provinceShipping / 100,
                ],
                [
                  'riskThreshold',
                  'Umbral de revisión · 0 a 100',
                  data.settings.riskThreshold,
                ],
                [
                  'phoneThreshold',
                  'Verificación de celular a partir de · Bs',
                  data.settings.phoneThreshold / 100,
                ],
              ].map(([key, label, value]) => (
                <label className="field-label" key={String(key)}>
                  {label}
                  <input
                    name={String(key)}
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={value}
                    required
                  />
                </label>
              ))}
              <label className="field-label">
                WhatsApp de la tienda
                <input
                  name="whatsapp"
                  defaultValue={data.settings.whatsapp}
                  placeholder="+59171234567"
                />
              </label>
              <label className="field-label wide">
                Datos bancarios públicos
                <textarea
                  name="bankDetails"
                  defaultValue={data.settings.bankDetails}
                  maxLength={1000}
                />
              </label>
            </div>
            <button className="button blue" disabled={busy}>
              Guardar configuración <Save size={15} />
            </button>
          </form>
          <p className="fine-print">
            El QR se configura con una imagen privada mediante el procedimiento
            del README. Las claves y contraseñas se administran fuera de este
            panel.
          </p>
        </section>
      )}
      {tab === 'audit' && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Cuándo</th>
                <th>Acción</th>
                <th>Actor</th>
                <th>Entidad</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.map((l) => (
                <tr key={l.id}>
                  <td>{new Date(l.createdAt).toLocaleString('es-BO')}</td>
                  <td>{l.action}</td>
                  <td>{l.actorId}</td>
                  <td>{l.entityId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
