import { createContext, useContext, useState, type ReactNode } from "react";
import type { CartItem, Quote } from "../shared/types";
import { useResource } from "./api";
type CartContextType = {
  items: CartItem[];
  setCount: (sku: string, n: number) => void;
  clear: () => void;
  key: string;
  quote: ReturnType<typeof useResource<Quote>>;
};
const CartContext = createContext<CartContextType>(null!);
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const quote = useResource<Quote>(items.length ? "/cart/quote" : null, {
    items,
  });
  function setCount(sku: string, n: number) {
    setItems((old) => [
      ...old.filter((i) => i.sku !== sku),
      ...(n > 0 ? [{ sku, cases: n }] : []),
    ]);
    setKey(crypto.randomUUID());
  }
  function clear() {
    setItems([]);
    setKey(crypto.randomUUID());
  }
  return (
    <CartContext.Provider value={{ items, setCount, clear, key, quote }}>
      {children}
    </CartContext.Provider>
  );
}
export const useCart = () => useContext(CartContext);
