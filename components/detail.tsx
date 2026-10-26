'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowUpRight,
  Heart,
  ShoppingBag,
  Zap,
  Truck,
  GraduationCap,
  Code2,
  Download,
  Share2,
} from 'lucide-react';
import { useStore } from './store';
import { ProductCard as Product, kindNames, money } from '@/lib/types';
import { ProductCard } from './product-card';
const delivery = {
  PHYSICAL: {
    icon: Truck,
    title: 'De aquí a donde estés',
    text: 'Recojo sin costo, delivery local o encomienda a provincias. La tarifa se calcula al finalizar.',
  },
  DIGITAL: {
    icon: Zap,
    title: 'Un código único. Solo tuyo.',
    text: 'Disponible en Mis compras después de confirmar el pago y la revisión de seguridad. Necesitas una cuenta con correo verificado. Un código revelado no admite devolución salvo defecto comprobado.',
  },
  COURSE: {
    icon: GraduationCap,
    title: 'Aprende a tu ritmo',
    text: 'Acceso desde Mis cursos al confirmar tu pago. Consulta el temario y la disponibilidad de contenido antes de comprar.',
  },
  SERVICE: {
    icon: Code2,
    title: 'Lo construimos contigo',
    text: 'Al confirmar tu pago creamos un proyecto en tu cuenta. Allí compartes tu brief y sigues las etapas del trabajo.',
  },
  DOWNLOAD: {
    icon: Download,
    title: 'Tu archivo, en privado',
    text: 'Descarga desde tu cuenta al confirmar el pago. Uso personal; hasta 10 descargas por compra.',
  },
};
export function Detail({
  product: p,
  related,
  reviews,
}: {
  product: Product;
  related: Product[];
  reviews: { name: string; rating: number; text: string }[];
}) {
  const s = useStore();
  const [variant, setVariant] = useState(p.variants[0].id);
  const v = p.variants.find((v) => v.id === variant)!;
  const info = delivery[p.type];
  return (
    <main className="shell product-detail">
      <div className="breadcrumb">
        <Link href="/">Inicio</Link>
        <span>/</span>
        <Link href={`/catalogo?categoria=${p.category}`}>{p.categoryName}</Link>
        <span>/</span>
        <span>{p.name}</span>
      </div>
      <div className="detail-grid">
        <div className="detail-image">
          <Image
            src={p.image}
            alt={p.imageAlt}
            width={650}
            height={470}
            priority
          />
        </div>
        <section className="detail-info">
          <span className="eyebrow">
            {p.brand} / {kindNames[p.type]}
          </span>
          <h1>
            {p.name}
            <span className="dot">.</span>
          </h1>
          <p className="detail-description">{p.description}</p>
          <div className="detail-price">
            <strong>{money(v.price, s.currency, s.exchangeRate)}</strong>
            {v.oldPrice && v.oldPrice > v.price && (
              <del>{money(v.oldPrice, s.currency, s.exchangeRate)}</del>
            )}
          </div>
          <span className="eyebrow">ELIGE TU VERSIÓN</span>
          <div className="variant-options">
            {p.variants.map((v) => (
              <button
                key={v.id}
                className={variant === v.id ? 'selected' : ''}
                onClick={() => setVariant(v.id)}
              >
                {v.name}
              </button>
            ))}
          </div>
          {p.type === 'DIGITAL' && (
            <p className="form-error">
              Plataforma: {v.platform} · Región: {v.region}. Comprueba la
              compatibilidad antes de pagar. Nunca te pediremos tu contraseña
              del juego. <Link href="/ayuda#canje">Guía de canje ↗</Link>
            </p>
          )}
          <div className="detail-actions">
            <button
              className="button blue"
              disabled={!v.stock}
              onClick={() => {
                s.add(p, v.id);
                s.setCartOpen(true);
              }}
            >
              <ShoppingBag size={18} />
              {v.stock ? 'Lo quiero en mi carrito' : 'Temporalmente agotado'}
              <ArrowUpRight size={18} />
            </button>
            <button
              className="icon-button"
              aria-label="Guardar en favoritos"
              onClick={() => s.wish(p.id)}
            >
              <Heart
                size={20}
                fill={s.wishlist.includes(p.id) ? 'currentColor' : 'none'}
              />
            </button>
          </div>
          <div className="delivery-note">
            <info.icon size={23} />
            <div>
              <strong>{info.title}</strong>
              <p>{info.text}</p>
            </div>
          </div>
          <button
            className="underlined-link"
            onClick={() => {
              window.open(
                `https://wa.me/?text=${encodeURIComponent(`Mira este pick: ${p.name} ${window.location.href}`)}`,
                '_blank',
                'noopener,noreferrer',
              );
            }}
          >
            <Share2 size={15} />
            Compartir por WhatsApp
          </button>
        </section>
      </div>
      <section className="specs">
        <div>
          <h2>EL PICK, EN DETALLE.</h2>
          {Object.entries(p.attributes).map(([name, value]) => (
            <div className="spec-row" key={name}>
              <span>{name}</span>
              <strong>{value}</strong>
            </div>
          ))}
          <div className="spec-row">
            <span>Disponibilidad</span>
            <strong>
              {v.stock
                ? p.type === 'PHYSICAL'
                  ? `${v.stock} unidades`
                  : 'Disponible'
                : 'Sin stock'}
            </strong>
          </div>
        </div>
        <div>
          <h2>LO QUE DICE LA GENTE.</h2>
          {reviews.length ? (
            reviews.map((r, i) => (
              <article className="review" key={i}>
                <span className="stars">{'★'.repeat(r.rating)}</span>
                <strong> {r.name} · Compra verificada</strong>
                <p>{r.text}</p>
              </article>
            ))
          ) : (
            <p>
              Este pick todavía no tiene reseñas. Las opiniones se publican
              después de verificar la compra y moderar el contenido.
            </p>
          )}
          <Link
            className="underlined-link"
            style={{ marginTop: 20 }}
            href="/cuenta"
          >
            Compré este producto y quiero opinar <ArrowUpRight size={15} />
          </Link>
        </div>
      </section>
      <section className="catalog-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">SIGUE EXPLORANDO</span>
            <h2>
              BUENA COMPAÑÍA<span className="dot">.</span>
            </h2>
          </div>
        </div>
        <div className="product-grid">
          {related.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </main>
  );
}
