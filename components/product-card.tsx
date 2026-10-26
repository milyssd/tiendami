'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Plus, Star, Check, Zap } from 'lucide-react';
import { ProductCard as Product, money } from '@/lib/types';
import { useStore } from './store';
export function ProductCard({
  product: p,
  index = 0,
}: {
  product: Product;
  index?: number;
}) {
  const s = useStore();
  const v = p.variants[0];
  if (!v) return null;
  const discount =
    v.oldPrice && v.oldPrice > v.price
      ? Math.round((1 - v.price / v.oldPrice) * 100)
      : 0;
  const selected = s.wishlist.includes(p.id);
  return (
    <article className={`product-card kind-${p.type.toLowerCase()}`}>
      <div className="product-art">
        <Link href={`/producto/${p.slug}`} aria-label={`Ver ${p.name}`}>
          <Image
            src={p.image}
            alt={p.imageAlt}
            width={500}
            height={360}
            priority={index < 4}
          />
        </Link>
        <span className={`product-label ${discount ? 'sale' : ''}`}>
          {discount
            ? `−${discount}%`
            : p.type === 'DIGITAL'
              ? 'CÓDIGO DIGITAL'
              : p.type === 'COURSE'
                ? 'APRENDE A TU RITMO'
                : p.type === 'SERVICE'
                  ? 'HECHO PARA TI'
                  : p.type === 'DOWNLOAD'
                    ? 'DESCARGA DIGITAL'
                    : 'EL BUEN PICK'}
        </span>
        <button
          className={`wish-button ${selected ? 'selected' : ''}`}
          aria-label={
            selected
              ? `Quitar ${p.name} de favoritos`
              : `Guardar ${p.name} en favoritos`
          }
          onClick={() => s.wish(p.id)}
        >
          <Heart size={18} fill={selected ? 'currentColor' : 'none'} />
        </button>
        {p.type === 'DIGITAL' && (
          <span className="digital-stamp">
            <Zap size={12} />
            Entrega digital
          </span>
        )}
      </div>
      <div className="product-info">
        <div className="product-meta">
          <span>{p.brand}</span>
          <span className="rating">
            <Star size={11} fill="currentColor" />
            {p.reviewCount ? p.rating.toFixed(1) : 'Nuevo'}
          </span>
        </div>
        <Link className="product-name" href={`/producto/${p.slug}`}>
          {p.name}
        </Link>
        <p className="product-caption">
          {Object.values(p.attributes).slice(0, 2).join(' · ') || v.name}
        </p>
        <div className="product-bottom">
          <div>
            {v.oldPrice && v.oldPrice > v.price ? (
              <del>{money(v.oldPrice, s.currency, s.exchangeRate)}</del>
            ) : (
              <span className="price-prefix">
                {p.variants.length > 1 ? 'Desde' : 'Precio'}
              </span>
            )}
            <strong>{money(v.price, s.currency, s.exchangeRate)}</strong>
          </div>
          <button
            className="add-button"
            onClick={() => s.add(p)}
            disabled={v.stock === 0}
            aria-label={`Añadir ${p.name} al carrito`}
          >
            <Plus size={22} />
          </button>
        </div>
        <div className={`stock-note ${v.stock === 0 ? 'out' : ''}`}>
          {v.stock > 0 ? (
            <>
              <Check size={12} />
              {p.type === 'PHYSICAL'
                ? 'Disponible en Bolivia'
                : p.type === 'DIGITAL'
                  ? 'Listo para canjear'
                  : 'Acceso con tu compra'}
            </>
          ) : (
            <>Temporalmente agotado</>
          )}
        </div>
      </div>
    </article>
  );
}
