'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  ArrowRight,
  Search,
  ShoppingBag,
  UserRound,
  Menu,
  X,
  Minus,
  Plus,
  Trash2,
  Sun,
  Moon,
  MapPin,
  ChevronDown,
  Gamepad2,
  ShieldCheck,
  Truck,
  Zap,
  MessageCircle,
} from 'lucide-react';
import { useStore, useBrowserStorage } from './store';
import { InkSpark } from './ink-spark';
import { money } from '@/lib/types';
function HeaderMenu({
  children,
}: {
  children: (open: boolean, toggle: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return children(open, () => setOpen((value) => !value));
}
export function Header() {
  const s = useStore();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [theme, setTheme] = useBrowserStorage('tm-theme');
  const dark = theme === 'dark';
  const path = usePathname();
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [dark]);
  function toggle() {
    setTheme(dark ? 'light' : 'dark');
  }
  return (
    <HeaderMenu key={path}>
      {(menu, toggleMenu) => (
        <>
          <div className="announcement">
            <span>
              DE BOLIVIA, PARA TU SIGUIENTE NIVEL <Zap size={12} />
            </span>
            <span className="announcement-right">
              Pagos en Bs · QR y transferencia{' '}
              <span className="bolivia">
                <i />
                <i />
                <i />
              </span>
            </span>
          </div>
          <header className="header">
            <div className="header-main shell">
              <Link className="wordmark" href="/" aria-label="TiendaMi, inicio">
                tienda<span>mi</span>
                <i>®</i>
                <InkSpark className="logo-spark" />
              </Link>
              <form
                className="search"
                onSubmit={(e) => {
                  e.preventDefault();
                  router.push(`/catalogo?q=${encodeURIComponent(q)}`);
                }}
              >
                <Search size={19} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="¿Cuál es tu próximo upgrade?"
                  aria-label="Buscar en el catálogo"
                />
                <kbd>↵</kbd>
              </form>
              <div className="header-actions">
                <button
                  className="currency"
                  onClick={() =>
                    s.setCurrency(s.currency === 'BOB' ? 'USD' : 'BOB')
                  }
                  aria-label="Cambiar moneda"
                >
                  {s.currency === 'BOB' ? 'BOB / Bs' : 'USD / $'}
                  <ChevronDown size={13} />
                </button>
                <button
                  className="icon-button theme-switch"
                  onClick={toggle}
                  aria-label={dark ? 'Usar modo claro' : 'Usar modo oscuro'}
                >
                  {dark ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <Link
                  className="account-link"
                  href="/cuenta"
                  aria-label="Mi cuenta"
                >
                  <UserRound size={21} />
                  <span>Mi cuenta</span>
                </Link>
                <button
                  className="bag-button"
                  onClick={() => s.setCartOpen(true)}
                  aria-label={`Abrir carrito, ${s.lines.reduce((n, l) => n + l.quantity, 0)} artículos`}
                >
                  <ShoppingBag size={20} />
                  <span className="bag-label">Carrito</span>
                  <b>{s.lines.reduce((n, l) => n + l.quantity, 0)}</b>
                </button>
                <button
                  className="icon-button mobile-menu"
                  onClick={toggleMenu}
                  aria-label="Abrir navegación"
                  aria-expanded={menu}
                >
                  {menu ? <X /> : <Menu />}
                </button>
              </div>
            </div>
            <nav
              className={`nav shell ${menu ? 'nav-open' : ''}`}
              aria-label="Navegación principal"
            >
              <div className="nav-links">
                <Link
                  href="/catalogo"
                  className={path === '/catalogo' ? 'active' : ''}
                >
                  <Menu size={16} />
                  Todo el catálogo
                </Link>
                <Link href="/catalogo?categoria=gaming">Gaming & tech</Link>
                <Link href="/catalogo?categoria=digitales">
                  Códigos digitales
                  <Zap size={13} />
                </Link>
                <Link href="/catalogo?categoria=perfumes">Perfumes</Link>
                <Link href="/catalogo?categoria=cursos">Cursos</Link>
                <Link href="/catalogo?categoria=servicios">
                  Servicios web
                  <ArrowUpRight size={14} />
                </Link>
              </div>
              <Link className="nav-offers" href="/catalogo?ofertas=1">
                Las buenas ofertas <ArrowUpRight size={15} />
              </Link>
            </nav>
          </header>
        </>
      )}
    </HeaderMenu>
  );
}
export function Cart() {
  const s = useStore();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (s.cartOpen) ref.current?.showModal();
    else ref.current?.close();
  }, [s.cartOpen]);
  return (
    <dialog
      ref={ref}
      className="cart-dialog"
      onCancel={() => s.setCartOpen(false)}
      onClick={(e) => {
        if (e.target === e.currentTarget) s.setCartOpen(false);
      }}
    >
      <section className="cart-content">
        <div className="drawer-head">
          <div>
            <span className="eyebrow">BUENOS PICKS</span>
            <h2>
              Tu carrito<span className="dot">.</span>
            </h2>
          </div>
          <button
            className="icon-button"
            onClick={() => s.setCartOpen(false)}
            aria-label="Cerrar carrito"
          >
            <X />
          </button>
        </div>
        {!s.lines.length ? (
          <div className="empty-state">
            <ShoppingBag size={48} />
            <h3>Tu próximo upgrade te espera.</h3>
            <p>Explora el catálogo y encuentra ese algo que va contigo.</p>
            <Link
              className="button blue"
              href="/catalogo"
              onClick={() => s.setCartOpen(false)}
            >
              Explorar catálogo <ArrowRight size={18} />
            </Link>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {s.lines.map((l) => (
                <article className="cart-line" key={l.variantId}>
                  <Image src={l.image} width={100} height={90} alt="" />
                  <div>
                    <Link
                      href={`/producto/${l.slug}`}
                      onClick={() => s.setCartOpen(false)}
                    >
                      {l.name}
                    </Link>
                    <small>{l.variant}</small>
                    <strong>
                      {money(l.price, s.currency, s.exchangeRate)}
                    </strong>
                    <div className="quantity">
                      <button
                        onClick={() => s.change(l.variantId, l.quantity - 1)}
                        aria-label={`Quitar una unidad de ${l.name}`}
                      >
                        <Minus size={13} />
                      </button>
                      <span>{l.quantity}</span>
                      <button
                        onClick={() => s.change(l.variantId, l.quantity + 1)}
                        aria-label={`Añadir una unidad de ${l.name}`}
                        disabled={l.type !== 'PHYSICAL' || l.quantity >= 10}
                      >
                        <Plus size={13} />
                      </button>
                      <button
                        className="remove"
                        onClick={() => s.change(l.variantId, 0)}
                        aria-label={`Eliminar ${l.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="cart-total">
              <span>Subtotal estimado</span>
              <strong>
                {money(
                  s.lines.reduce((n, l) => n + l.price * l.quantity, 0),
                  s.currency,
                  s.exchangeRate,
                )}
              </strong>
            </div>
            <p className="fine-print">
              Stock, descuentos y total se verifican en el servidor al crear tu
              pedido. Envío calculado al finalizar.
            </p>
            <Link
              className="button blue full"
              href="/checkout"
              onClick={() => s.setCartOpen(false)}
            >
              Continuar con mi pedido <ArrowRight size={18} />
            </Link>
            <button
              className="text-button"
              onClick={() => s.setCartOpen(false)}
            >
              Seguir explorando
            </button>
          </>
        )}
      </section>
    </dialog>
  );
}
export function Benefits() {
  return (
    <div className="benefits shell">
      <div>
        <Truck />
        <p>
          <strong>De aquí a toda Bolivia</strong>
          <span>Recojo, delivery y encomiendas</span>
        </p>
      </div>
      <div>
        <ShieldCheck />
        <p>
          <strong>Tu compra, bien cuidada</strong>
          <span>Pagos revisados y soporte local</span>
        </p>
      </div>
      <div>
        <Zap />
        <p>
          <strong>Digitales sin vueltas</strong>
          <span>Códigos tras confirmar tu pago</span>
        </p>
      </div>
      <div>
        <MessageCircle />
        <p>
          <strong>Hablemos de persona a persona</strong>
          <span>Te ayudamos a elegir mejor</span>
        </p>
      </div>
    </div>
  );
}
export function Footer() {
  return (
    <footer>
      <div className="footer-main shell">
        <div>
          <Link href="/" className="wordmark">
            tienda<span>mi</span>
            <InkSpark className="logo-spark" />
          </Link>
          <p>
            Para jugar. Para crear. Para ser tú.
            <br />
            Tu próxima buena compra empieza aquí.
          </p>
          <span className="footer-location">
            <MapPin size={14} />
            Hecho para Bolivia.
          </span>
        </div>
        <div>
          <h3>EXPLORA</h3>
          <Link href="/catalogo?categoria=gaming">Gaming & tech</Link>
          <Link href="/catalogo?categoria=digitales">Códigos digitales</Link>
          <Link href="/catalogo?categoria=perfumes">Perfumes & decants</Link>
          <Link href="/catalogo?categoria=cursos">Cursos y descargables</Link>
        </div>
        <div>
          <h3>ESTAMOS PARA TI</h3>
          <Link href="/cuenta">Mi cuenta y pedidos</Link>
          <Link href="/ayuda">Preguntas frecuentes</Link>
          <Link href="/legal/envios">Envíos y devoluciones</Link>
          <Link href="/catalogo?categoria=servicios">
            Hagamos tu página web
          </Link>
        </div>
        <div className="footer-note">
          <Gamepad2 size={30} />
          <h3>
            ELIGE TU
            <br />
            SIGUIENTE NIVEL.
          </h3>
          <span>Sin complicarte la partida.</span>
        </div>
      </div>
      <div className="footer-bottom shell">
        <span>© {new Date().getFullYear()} TiendaMi · Bolivia</span>
        <div>
          <Link href="/legal/terminos">Términos</Link>
          <Link href="/legal/privacidad">Privacidad</Link>
          <button
            onClick={() =>
              window.dispatchEvent(new Event('tm-cookie-settings'))
            }
          >
            Configurar cookies
          </button>
        </div>
        <span className="payment-tags">
          QR <b>·</b> TRANSFERENCIA
        </span>
      </div>
    </footer>
  );
}
export function Cookies() {
  const [consent, setConsent] = useBrowserStorage('tm-consent');
  const [requested, setRequested] = useState(false);
  const [settings, setSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const show = consent !== null && (!consent || requested);
  useEffect(() => {
    const open = () => {
      setRequested(true);
      setSettings(true);
    };
    window.addEventListener('tm-cookie-settings', open);
    return () => window.removeEventListener('tm-cookie-settings', open);
  }, []);
  function save(allow: boolean) {
    setConsent(
      JSON.stringify({
        essential: true,
        analytics: allow,
        at: new Date().toISOString(),
      }),
    );
    setRequested(false);
  }
  if (!show) return null;
  return (
    <aside className="cookie-banner" aria-label="Preferencias de cookies">
      <div>
        <strong>Cookies, sin letra pequeña.</strong>
        <p>
          Usamos cookies esenciales para tu sesión. Las de analítica son
          opcionales.
        </p>
        {settings && (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
            />
            Permitir analítica anónima
          </label>
        )}
      </div>
      <div className="cookie-actions">
        <button onClick={() => save(false)}>Solo esenciales</button>
        <button
          onClick={() => (settings ? save(analytics) : setSettings(true))}
        >
          {settings ? 'Guardar' : 'Configurar'}
        </button>
        <button className="button blue" onClick={() => save(true)}>
          Aceptar todas
        </button>
      </div>
    </aside>
  );
}
