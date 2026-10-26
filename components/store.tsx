'use client';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useSyncExternalStore,
  ReactNode,
} from 'react';
import type { ProductCard } from '@/lib/types';
type Line = {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  variant: string;
  price: number;
  image: string;
  type: ProductCard['type'];
  quantity: number;
};
type Store = {
  lines: Line[];
  add: (p: ProductCard, variantId?: string) => void;
  change: (id: string, quantity: number) => void;
  clear: () => void;
  cartOpen: boolean;
  setCartOpen: (v: boolean) => void;
  wishlist: string[];
  wish: (id: string) => void;
  currency: string;
  setCurrency: (v: string) => void;
  toast: string;
  notify: (v: string) => void;
  exchangeRate: number;
};
// localStorage is an external store: its server snapshot is intentionally
// empty, while React reads the browser value after hydration. Reads return a
// primitive so unchanged snapshots stay referentially stable.
const storageEvent = 'tm-storage-change';
const volatileValues = new Map<string, string>();
function readBrowserStorage(key: string): string {
  if (typeof window === 'undefined') return '';
  if (volatileValues.has(key)) return volatileValues.get(key)!;
  try {
    return window.localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}
function writeBrowserStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
    volatileValues.delete(key);
  } catch {
    // Preserve the current tab's interaction when storage is denied or full.
    volatileValues.set(key, value);
  }
  window.dispatchEvent(new CustomEvent(storageEvent, { detail: key }));
}
function serverStorageSnapshot(): null {
  return null;
}
type BrowserStorageUpdate = string | ((current: string) => string);
export function useBrowserStorage(
  key: string,
): readonly [string | null, (value: BrowserStorageUpdate) => void] {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const changedInAnotherTab = (event: StorageEvent) => {
        if (event.key === null) {
          volatileValues.clear();
          onChange();
        } else if (event.key === key) {
          volatileValues.delete(key);
          onChange();
        }
      };
      const changedInThisTab = (event: Event) => {
        if ((event as CustomEvent<string>).detail === key) onChange();
      };
      window.addEventListener('storage', changedInAnotherTab);
      window.addEventListener(storageEvent, changedInThisTab);
      return () => {
        window.removeEventListener('storage', changedInAnotherTab);
        window.removeEventListener(storageEvent, changedInThisTab);
      };
    },
    [key],
  );
  const snapshot = useCallback(() => readBrowserStorage(key), [key]);
  const value = useSyncExternalStore<string | null>(
    subscribe,
    snapshot,
    serverStorageSnapshot,
  );
  const update = useCallback(
    (next: BrowserStorageUpdate) => {
      writeBrowserStorage(
        key,
        typeof next === 'function' ? next(readBrowserStorage(key)) : next,
      );
    },
    [key],
  );
  return [value, update];
}
function parseLines(value: string | null): Line[] {
  try {
    const parsed: unknown = JSON.parse(value || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item: unknown): item is Line => {
      if (!item || typeof item !== 'object') return false;
      const line = item as Partial<Line>;
      return (
        typeof line.variantId === 'string' &&
        typeof line.quantity === 'number' &&
        Number.isInteger(line.quantity) &&
        line.quantity > 0 &&
        line.quantity <= 10 &&
        Number.isInteger(line.price)
      );
    });
  } catch {
    return [];
  }
}
function parseWishlist(value: string | null): string[] {
  try {
    const parsed: unknown = JSON.parse(value || '[]');
    return Array.isArray(parsed)
      ? parsed.filter((id: unknown): id is string => typeof id === 'string')
      : [];
  } catch {
    return [];
  }
}
const Context = createContext<Store | null>(null);
export function StoreProvider({
  children,
  exchangeRate,
}: {
  children: ReactNode;
  exchangeRate: number;
}) {
  const [savedLines, setSavedLines] = useBrowserStorage('tm-bag');
  const [savedWishlist, setSavedWishlist] = useBrowserStorage('tm-wishes');
  const lines = useMemo(() => parseLines(savedLines), [savedLines]);
  const wishlist = useMemo(() => parseWishlist(savedWishlist), [savedWishlist]);
  const [cartOpen, setCartOpen] = useState(false);
  const [currency, setCurrency] = useState('BOB');
  const [toast, setToast] = useState('');
  function setLines(update: Line[] | ((current: Line[]) => Line[])) {
    setSavedLines((raw) =>
      JSON.stringify(
        typeof update === 'function' ? update(parseLines(raw)) : update,
      ),
    );
  }
  function setWishlist(update: (current: string[]) => string[]) {
    setSavedWishlist((raw) => JSON.stringify(update(parseWishlist(raw))));
  }
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  const notify = useCallback((v: string) => setToast(v), []);
  function add(p: ProductCard, variantId?: string) {
    const v = p.variants.find((v) => v.id === variantId) ?? p.variants[0];
    if (!v || v.stock < 1) {
      notify('Este producto está agotado.');
      return;
    }
    setLines((old) => {
      const existing = old.find((l) => l.variantId === v.id);
      if (existing)
        return old.map((l) =>
          l.variantId === v.id
            ? {
                ...l,
                quantity: Math.min(
                  l.quantity + 1,
                  p.type === 'PHYSICAL' ? Math.min(v.stock, 10) : 1,
                ),
              }
            : l,
        );
      return [
        ...old,
        {
          variantId: v.id,
          productId: p.id,
          slug: p.slug,
          name: p.name,
          variant: v.name,
          price: v.price,
          image: p.image,
          type: p.type,
          quantity: 1,
        },
      ];
    });
    notify('¡Buen pick! Ya está en tu carrito.');
  }
  function change(id: string, quantity: number) {
    setLines((old) =>
      quantity <= 0
        ? old.filter((l) => l.variantId !== id)
        : old.map((l) =>
            l.variantId === id
              ? {
                  ...l,
                  quantity: Math.min(quantity, l.type === 'PHYSICAL' ? 10 : 1),
                }
              : l,
          ),
    );
  }
  function wish(id: string) {
    setWishlist((old) =>
      old.includes(id) ? old.filter((x) => x !== id) : [...old, id],
    );
  }
  return (
    <Context.Provider
      value={{
        lines,
        add,
        change,
        clear: () => setLines([]),
        cartOpen,
        setCartOpen,
        wishlist,
        wish,
        currency,
        setCurrency,
        toast,
        notify,
        exchangeRate,
      }}
    >
      {children}
      <div className={`toast ${toast ? 'show' : ''}`} role="status">
        {toast}
      </div>
    </Context.Provider>
  );
}
export function useStore() {
  const s = useContext(Context);
  if (!s) throw new Error('Store provider missing');
  return s;
}
