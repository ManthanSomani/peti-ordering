import { DomainError } from "../shared/pricing";
import type { Order } from "../shared/types";

function csvText(value: string) {
  const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(value) ? "'" + value : value;
  return '"' + safe.replaceAll('"', '""') + '"';
}

export function orderExport(order: Order) {
  if (order.status !== "packed") {
    throw new DomainError(
      "EXPORT_NOT_READY",
      "Pack the order before exporting.",
      409,
    );
  }
  const money = (paise: number) => (paise / 100).toFixed(2);
  const sum = order.lines.reduce((total, line) => total + line.totalPaise, 0);
  if (
    !order.lines.length ||
    sum !== order.totalPaise ||
    order.lines.some(
      (line) =>
        !line.sku ||
        !Number.isSafeInteger(line.totalPaise) ||
        line.totalPaise < 0 ||
        line.subtotalPaise - line.discountPaise !== line.totalPaise,
    )
  ) {
    throw new DomainError(
      "EXPORT_INVALID",
      "The saved order totals need review.",
      409,
    );
  }
  const header =
    "OrderReference,OrderDateIST,PartyReference,PartyName,StockItemReference,StockItemName,PiecesPerCase,PaidCases,FreeCases,UnitPriceINR,GrossINR,DiscountINR,NetINR";
  const date = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Kolkata",
    dateStyle: "short",
  }).format(new Date(order.createdAt));
  const rows = order.lines.map((line) =>
    [
      ...[
        order.id,
        date,
        order.retailerId,
        order.shop,
        line.sku,
        line.name,
      ].map(csvText),
      line.pack,
      line.cases,
      line.freeCases,
      money(line.unitPricePaise),
      money(line.subtotalPaise),
      money(line.discountPaise),
      money(line.totalPaise),
    ].join(","),
  );
  return [header, ...rows].join("\r\n") + "\r\n";
}
