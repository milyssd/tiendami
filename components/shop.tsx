'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Gamepad2,
  Zap,
  Droplets,
  GraduationCap,
  Code2,
  Download,
  SlidersHorizontal,
  X,
  Heart,
  Search,
} from 'lucide-react';
import type { ProductCard as Product } from '@/lib/types';
import { ProductCard } from './product-card';
import { InkSpark } from './ink-spark';
import { useStore } from './store';
const categories = [
  { slug: 'todos', name: 'Todo el universo', icon: Gamepad2 },
  { slug: 'gaming', name: 'Gaming & tech', icon: Gamepad2 },
  { slug: 'digitales', name: 'Códigos digitales', icon: Zap },
  { slug: 'perfumes', name: 'Perfumes', icon: Droplets },
  { slug: 'cursos', name: 'Cursos', icon: GraduationCap },
  { slug: 'servicios', name: 'Servicios web', icon: Code2 },
  { slug: 'descargables', name: 'Descargables', icon: Download },
];
export function Home({ products }: { products: Product[] }) {
  const [tab, setTab] = useState('todos');
  const selected = products.filter(
    (p) => tab === 'todos' || p.category === tab,
  );
  return (
    <>
      <section className="hero-grid shell">
        <div className="hero-main">
          <div className="halftone" />
          <div className="hero-copy">
            <div className="hero-kicker">
              <span className="mini-star">✦</span>MUCHO MÁS QUE UNA TIENDA
            </div>
            <h1>
              TU PRÓXIMO
              <br />
              NIVEL EMPIEZA
              <br />
              <em>AQUÍ.</em>
              <InkSpark className="title-star" />
            </h1>
            <p>
              Eso que te gusta. Eso que te mueve.
              <br />
              Gaming, estilo y nuevas habilidades, en un solo lugar.
            </p>
            <Link className="button yellow" href="/catalogo">
              Encuentra tu próximo upgrade
              <ArrowUpRight size={19} />
            </Link>
            <span className="hero-caption">BUENOS PICKS. CERO VUELTAS.</span>
          </div>
          <div className="hero-visual">
            <div className="hero-orbit" />
            <span className="comic-burst">
              ¡DALE
              <br />
              PLAY!
            </span>
            <Image
              className="hero-controller"
              src="/art/controller.svg"
              width={540}
              height={420}
              alt="Control de videojuegos ilustrado en blanco y negro"
              priority
            />
            <span className="hero-sticker">
              TU SETUP.
              <br />
              <b>TUS REGLAS.</b>
            </span>
            <svg className="scribble" viewBox="0 0 100 100" aria-hidden="true">
              <path d="M10 20 Q95 10 70 75 M51 58 L71 78 L88 52" />
            </svg>
          </div>
          <span className="hero-edition">VOL. 01 / EL UNIVERSO TIENDAMI</span>
        </div>
        <div className="hero-side">
          <Link className="promo-digital" href="/catalogo?categoria=digitales">
            <div>
              <span className="eyebrow">
                <Zap size={13} />
                DIRECTO A TU CUENTA
              </span>
              <h2>
                MENOS ESPERA.
                <br />
                MÁS PARTIDA.
              </h2>
              <p>Juegos, gift cards y V-Bucks.</p>
            </div>
            <Image
              src="/art/giftcard.svg"
              width={220}
              height={155}
              alt="Tarjeta digital Steam de 20 dólares"
            />
            <span className="round-arrow">
              <ArrowUpRight size={24} />
            </span>
            <span className="promo-foot">Explorar códigos digitales</span>
          </Link>
          <Link className="promo-course" href="/catalogo?categoria=cursos">
            <div>
              <span className="eyebrow">DESBLOQUEA OTRA HABILIDAD</span>
              <h2>
                EL MEJOR UPGRADE
                <br />
                ERES TÚ.
              </h2>
              <span>Cursos que sí te llevan a crear.</span>
            </div>
            <span className="course-symbol">&lt;/&gt;</span>
            <span className="round-arrow">
              <ArrowUpRight size={22} />
            </span>
          </Link>
        </div>
      </section>
      <section className="ticker" aria-label="Nuestra selección">
        <div>
          <span>JUEGA A TU MANERA</span>
          <InkSpark />
          <span>HUELE A TI</span>
          <InkSpark />
          <span>APRENDE ALGO NUEVO</span>
          <InkSpark />
          <span>CREA LO QUE IMAGINAS</span>
          <InkSpark />
          <span>JUEGA A TU MANERA</span>
          <InkSpark />
        </div>
      </section>
      <section className="catalog-section shell" id="seleccion">
        <div className="section-heading">
          <div>
            <span className="eyebrow">LA SELECCIÓN DE LA CASA</span>
            <h2>
              BUENOS PICKS<span className="dot">.</span>
            </h2>
          </div>
          <Link className="underlined-link" href="/catalogo">
            Ver todo el catálogo <ArrowUpRight size={18} />
          </Link>
        </div>
        <div
          className="category-tabs"
          role="group"
          aria-label="Filtrar selección"
        >
          {categories.slice(0, 6).map((c) => (
            <button
              className={tab === c.slug ? 'selected' : ''}
              onClick={() => setTab(c.slug)}
              key={c.slug}
            >
              <c.icon size={16} />
              {c.name}
            </button>
          ))}
        </div>
        <div className="product-grid">
          {selected.slice(0, 8).map((p, i) => (
            <ProductCard product={p} index={i} key={p.id} />
          ))}
        </div>
        {!selected.length && (
          <p className="empty-state">
            Pronto habrá nuevos picks en esta sección.
          </p>
        )}
      </section>
      <section className="editorial-grid shell">
        <Link href="/catalogo?categoria=perfumes" className="perfume-editorial">
          <div>
            <span className="eyebrow">OTRA FORMA DE DEJAR HUELLA</span>
            <h2>
              NO TODO
              <br />
              SE VE.
              <br />
              <em>SE SIENTE.</em>
            </h2>
            <p>
              Perfumes y decants.
              <br />
              Encuentra tu próxima firma.
            </p>
            <span className="underlined-link">
              Descubre las fragancias <ArrowUpRight size={19} />
            </span>
          </div>
          <Image
            src="/art/perfume.svg"
            width={390}
            height={340}
            alt="Perfume Atelier No. 07 en frasco de vidrio ámbar"
          />
          <span className="editorial-number">02 / ESTILO PROPIO</span>
        </Link>
        <Link
          href="/catalogo?categoria=servicios"
          className="service-editorial"
        >
          <span className="eyebrow">DE IDEA A PÁGINA WEB</span>
          <h2>
            TU PROYECTO
            <br />
            MERECE SALIR
            <br />
            <span>A JUGAR.</span>
          </h2>
          <p>
            Diseño y desarrollo web para negocios
            <br />
            con algo que contar. Como el tuyo.
          </p>
          <span className="button paper">
            Hagamos tu web
            <ArrowUpRight size={19} />
          </span>
          <ArrowUpRight className="service-doodle" strokeWidth={1.5} />
          <span className="editorial-number">03 / HECHO CONTIGO</span>
        </Link>
      </section>
      <section className="manifesto shell">
        <InkSpark className="manifesto-star" />
        <div>
          <span className="eyebrow">MUCHAS PASIONES. UN MISMO LUGAR.</span>
          <h2>
            NO TIENES UN SOLO MODO.
            <br />
            TU TIENDA TAMPOCO.
          </h2>
          <p>
            Hoy juegas, mañana creas, siempre eres tú. En TiendaMi reunimos
            <br className="desktop-only" /> cosas que nos gustan para personas
            que no caben en una sola categoría.
          </p>
        </div>
        <span className="manifesto-sign">
          Nos vemos en
          <br />
          <b>el siguiente nivel.</b>
          <svg viewBox="0 0 140 15">
            <path d="M3 10 Q70 -3 136 8" />
          </svg>
        </span>
      </section>
    </>
  );
}
export function Catalog({
  products,
  initialCategory = 'todos',
  query = '',
  offers = false,
  wishes = false,
}: {
  products: Product[];
  initialCategory?: string;
  query?: string;
  offers?: boolean;
  wishes?: boolean;
}) {
  const s = useStore();
  const [category, setCategory] = useState(initialCategory);
  const [search, setSearch] = useState(query);
  const [sort, setSort] = useState('featured');
  const [inStock, setInStock] = useState(false);
  const [sale, setSale] = useState(offers);
  const [max, setMax] = useState(5000);
  const [filterOpen, setFilterOpen] = useState(false);
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [compared, setCompared] = useState<string[]>([]);
  const attributeOptions = useMemo(() => {
    const result: Record<string, Set<string>> = {};
    products
      .filter((p) => category === 'todos' || p.category === category)
      .forEach((p) =>
        Object.entries(p.attributes).forEach(([k, v]) => {
          (result[k] ??= new Set()).add(v);
        }),
      );
    return result;
  }, [products, category]);
  const result = useMemo(
    () =>
      products
        .filter(
          (p) =>
            (category === 'todos' || p.category === category) &&
            (!wishes || s.wishlist.includes(p.id)) &&
            `${p.name} ${p.brand} ${p.description}`
              .toLowerCase()
              .includes(search.toLowerCase()) &&
            (!inStock || p.variants.some((v) => v.stock > 0)) &&
            (!sale ||
              p.variants.some((v) => v.oldPrice && v.oldPrice > v.price)) &&
            p.variants[0].price <= max * 100 &&
            Object.entries(attributes).every(
              ([k, v]) => !v || p.attributes[k] === v,
            ),
        )
        .sort((a, b) =>
          sort === 'low'
            ? a.variants[0].price - b.variants[0].price
            : sort === 'high'
              ? b.variants[0].price - a.variants[0].price
              : sort === 'name'
                ? a.name.localeCompare(b.name)
                : Number(b.featured) - Number(a.featured),
        ),
    [
      products,
      category,
      wishes,
      s.wishlist,
      search,
      inStock,
      sale,
      max,
      attributes,
      sort,
    ],
  );
  return (
    <main className="shell catalog-page">
      <div className="breadcrumb">
        <Link href="/">Inicio</Link>
        <span>/</span>
        <span>{wishes ? 'Favoritos' : 'Catálogo'}</span>
      </div>
      <div className="section-heading">
        <div>
          <span className="eyebrow">ENCUENTRA ESO QUE VA CONTIGO</span>
          <h1>
            {wishes ? 'TUS FAVORITOS' : 'TODO EL UNIVERSO'}
            <span className="dot">.</span>
          </h1>
        </div>
        <span className="catalog-count">{result.length} buenos picks</span>
      </div>
      <div className="category-tabs">
        {categories.map((c) => (
          <button
            className={category === c.slug ? 'selected' : ''}
            key={c.slug}
            onClick={() => {
              setCategory(c.slug);
              setAttributes({});
            }}
          >
            <c.icon size={16} />
            {c.name}
          </button>
        ))}
      </div>
      <div className="catalog-layout">
        <aside className={`filters ${filterOpen ? 'open' : ''}`}>
          <div className="filter-title">
            <strong>
              <SlidersHorizontal size={17} />
              Afina tu búsqueda
            </strong>
            <button
              className="icon-button"
              onClick={() => setFilterOpen(false)}
              aria-label="Cerrar filtros"
            >
              <X size={18} />
            </button>
          </div>
          <label className="field-label">
            Buscar
            <div className="filter-search">
              <Search size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nombre, marca…"
              />
            </div>
          </label>
          <div className="filter-group">
            <strong>Tu presupuesto</strong>
            <label htmlFor="price-range">
              Hasta Bs {max.toLocaleString('es-BO')}
            </label>
            <input
              id="price-range"
              type="range"
              min="50"
              max="5000"
              step="50"
              value={max}
              onChange={(e) => setMax(Number(e.target.value))}
            />
            <div className="range-labels">
              <span>Bs 50</span>
              <span>Bs 5.000</span>
            </div>
          </div>
          <div className="filter-group">
            <strong>Solo lo que buscas</strong>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => setInStock(e.target.checked)}
              />
              Disponible ahora
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={sale}
                onChange={(e) => setSale(e.target.checked)}
              />
              En oferta
            </label>
          </div>
          {Object.entries(attributeOptions).map(([k, options]) => (
            <label className="field-label filter-group" key={k}>
              {k}
              <select
                value={attributes[k] ?? ''}
                onChange={(e) =>
                  setAttributes({ ...attributes, [k]: e.target.value })
                }
              >
                <option value="">Todas las opciones</option>
                {Array.from(options).map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
          ))}
          <button
            className="text-button"
            onClick={() => {
              setSearch('');
              setInStock(false);
              setSale(false);
              setMax(5000);
              setAttributes({});
            }}
          >
            Limpiar filtros
          </button>
          <div className="filter-help">
            <span>¿NO SABES CUÁL ELEGIR?</span>
            <p>Te damos una mano.</p>
            <Link href="/ayuda">
              Conversemos <ArrowUpRight size={15} />
            </Link>
          </div>
          <Link className="underlined-link" href="/favoritos">
            <Heart size={16} />
            Mis favoritos ({s.wishlist.length})
          </Link>
        </aside>
        <div>
          <div className="catalog-toolbar">
            <button
              className="filter-mobile button paper"
              onClick={() => setFilterOpen(true)}
            >
              <SlidersHorizontal size={16} />
              Filtros
            </button>
            <span>
              {query
                ? `Resultados para “${search}”`
                : 'Cada pick tiene algo que contar.'}
            </span>
            <label>
              Ordenar por{' '}
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="featured">Destacados</option>
                <option value="low">Menor precio</option>
                <option value="high">Mayor precio</option>
                <option value="name">Nombre A–Z</option>
              </select>
            </label>
          </div>
          <div className="product-grid catalog-products">
            {result.map((p, i) => (
              <div key={p.id}>
                <ProductCard product={p} index={i} />
                {p.category === 'gaming' && (
                  <label className="compare-check checkbox">
                    <input
                      type="checkbox"
                      checked={compared.includes(p.id)}
                      onChange={(e) => {
                        if (e.target.checked && compared.length === 3) {
                          s.notify('Puedes comparar hasta 3 productos.');
                          return;
                        }
                        setCompared(
                          e.target.checked
                            ? [...compared, p.id]
                            : compared.filter((id) => id !== p.id),
                        );
                      }}
                    />
                    Comparar
                  </label>
                )}
              </div>
            ))}
          </div>
          {!result.length && (
            <div className="empty-state">
              <Search size={40} />
              <h3>Por aquí no hay coincidencias.</h3>
              <p>Prueba otra búsqueda o amplía tus filtros.</p>
              <button
                className="button blue"
                onClick={() => {
                  setCategory('todos');
                  setSearch('');
                  setSale(false);
                  setInStock(false);
                  setMax(5000);
                  setAttributes({});
                }}
              >
                Ver todo
              </button>
            </div>
          )}
          {compared.length > 0 && (
            <section className="comparison">
              <h3>TU SETUP, FRENTE A FRENTE</h3>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Característica</th>
                      {products
                        .filter((p) => compared.includes(p.id))
                        .map((p) => (
                          <th key={p.id}>{p.name}</th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {['Precio', 'Conexión', 'Compatibilidad', 'Garantía'].map(
                      (k) => (
                        <tr key={k}>
                          <th>{k}</th>
                          {products
                            .filter((p) => compared.includes(p.id))
                            .map((p) => (
                              <td key={p.id}>
                                {k === 'Precio'
                                  ? `Bs ${p.variants[0].price / 100}`
                                  : (p.attributes[k] ?? '—')}
                              </td>
                            ))}
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
