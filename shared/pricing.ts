import type { CartItem, Product, Quote } from "./types";

export class DomainError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

/** All money uses integer paise. Three percent is rounded half-up once per line. */
export function priceCart(items: CartItem[], products: Product[]): Quote {
  if (!items.length || items.length > 50)
    throw new DomainError("INVALID_CART", "Add between 1 and 50 products.");
  if (new Set(items.map((i) => i.sku)).size !== items.length)
    throw new DomainError(
      "DUPLICATE_SKU",
      "Combine repeated products into one line.",
    );
  const lines = items.map((item) => {
    if (!Number.isInteger(item.cases) || item.cases < 1 || item.cases > 1000)
      throw new DomainError(
        "INVALID_QUANTITY",
        "Choose 1 to 1,000 whole cases.",
      );
    const p = products.find((p) => p.id === item.sku);
    if (!p)
      throw new DomainError(
        "UNKNOWN_PRODUCT",
        "A product is unavailable. Refresh the catalogue.",
      );
    const freeCases = p.scheme === "free10" ? Math.floor(item.cases / 10) : 0;
    if (item.cases + freeCases > p.stock)
      throw new DomainError(
        "INSUFFICIENT_STOCK",
        `${p.name}: not enough stock for paid and free cases.`,
        409,
      );
    const subtotalPaise = p.pricePaise * p.pack * item.cases;
    const discountPaise =
      p.scheme === "discount3" && item.cases >= 5
        ? Math.floor((subtotalPaise * 3 + 50) / 100)
        : 0;
    return {
      ...item,
      name: p.name,
      nameHi: p.nameHi,
      pack: p.pack,
      unitPricePaise: p.pricePaise,
      freeCases,
      subtotalPaise,
      discountPaise,
      totalPaise: subtotalPaise - discountPaise,
      scheme: p.scheme,
    };
  });
  return {
    lines,
    subtotalPaise: lines.reduce((a, l) => a + l.subtotalPaise, 0),
    discountPaise: lines.reduce((a, l) => a + l.discountPaise, 0),
    totalPaise: lines.reduce((a, l) => a + l.totalPaise, 0),
    paidCases: lines.reduce((a, l) => a + l.cases, 0),
    freeCases: lines.reduce((a, l) => a + l.freeCases, 0),
  };
}
