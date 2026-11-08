import { expect, it } from "vitest";
import { orderExport } from "../server/order-export";
import { priceCart } from "../shared/pricing";
import { seedProducts } from "../server/database";
import type { Order } from "../shared/types";

it("exports saved scheme amounts and neutralizes spreadsheet formulas", () => {
  const quote = priceCart(
    [
      { sku: "SKU-BS-075", cases: 10 },
      { sku: "SKU-DT-1KG", cases: 5 },
    ],
    seedProducts,
  );
  const order: Order = {
    ...quote,
    id: "PT-FIXTURE",
    retailerId: "r1",
    shop: '=SUM(1,2) "Demo"',
    createdAt: "2026-11-07T20:00:00.000Z",
    status: "packed",
  };
  const csv = orderExport(order);
  expect(csv).toContain('"2026-11-08"');
  expect(csv).toContain('"\'=SUM(1,2) ""Demo"""');
  expect(csv).toContain(",96,10,1,8.10,7776.00,0.00,7776.00");
  expect(csv).toContain(",20,5,0,101.50,10150.00,304.50,9845.50");
  expect(() => orderExport({ ...order, status: "cancelled" })).toThrow(
    "Pack the order",
  );
  expect(() => orderExport({ ...order, totalPaise: 1 })).toThrow(
    "saved order totals",
  );
});
