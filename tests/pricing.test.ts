import { describe, it, expect } from "vitest";
import { priceCart } from "../shared/pricing";
import { seedProducts } from "../server/database";
describe("schemes and money", () => {
  it.each([
    [9, 0],
    [10, 1],
    [19, 1],
    [20, 2],
  ])("adds free goods for %i paid biscuit cases", (cases, free) => {
    const q = priceCart([{ sku: "SKU-BS-075", cases }], seedProducts);
    expect(q.freeCases).toBe(free);
    expect(q.totalPaise).toBe(cases * 96 * 810);
  });
  it.each([
    [4, 0],
    [5, 30450],
    [6, 36540],
  ])("applies the discount threshold at %i cases", (cases, discount) => {
    const q = priceCart([{ sku: "SKU-DT-1KG", cases }], seedProducts);
    expect(q.discountPaise).toBe(discount);
    expect(q.totalPaise).toBe(cases * 20 * 10150 - discount);
  });
  it("rounds a half paise up, once per line", () => {
    const products = [{ ...seedProducts[1], pricePaise: 10, pack: 1 }];
    expect(
      priceCart([{ sku: "SKU-DT-1KG", cases: 5 }], products).discountPaise,
    ).toBe(2);
  });
  it("counts free goods against stock", () => {
    expect(() =>
      priceCart(
        [{ sku: "SKU-BS-075", cases: 10 }],
        [{ ...seedProducts[0], stock: 10 }],
      ),
    ).toThrow("not enough stock");
  });
  it("rejects unavailable tea, fractional/negative cases, unknown and duplicate SKUs", () => {
    for (const items of [
      [{ sku: "SKU-TE-250", cases: 1 }],
      [{ sku: "SKU-BS-075", cases: 1.5 }],
      [{ sku: "SKU-BS-075", cases: -1 }],
      [{ sku: "UNKNOWN", cases: 1 }],
      [
        { sku: "SKU-BS-075", cases: 1 },
        { sku: "SKU-BS-075", cases: 1 },
      ],
    ])
      expect(() => priceCart(items, seedProducts)).toThrow();
  });
});
