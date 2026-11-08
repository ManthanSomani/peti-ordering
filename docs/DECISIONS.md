# Initial architecture and assumptions

These are implementation assumptions for a fictional take-home, not additional client facts.

## Stack

React + TypeScript + Vite, Express 5, Node 22.13+ and built-in SQLite. One Node process serves the API and built frontend; SQLite keeps setup self-contained. Database is private, WAL-enabled and persistent on disk. A deployed single-instance demo requires a persistent volume; horizontal scaling/serverless ephemeral storage would require a different database. Node 22's SQLite driver is experimental. No hosting purchase or deployment has been performed.

Server modules own validation/auth/data; shared domain functions own scheme arithmetic. Browser contains no credentials or trusted role/price logic. Pricing in integer paise. Server-side sessions use random bearer tokens, only hashes stored in SQLite, HttpOnly SameSite=Lax cookies, 8-hour expiry. Mutations require a same-origin custom header; explicit origin validation and no CORS prevent cross-site writes. Demo OTP is deliberately simulated, expires in five minutes, is attempt-limited and available only with DEMO_MODE=true. No real phone/email/OTP provider. Do not enable public demo accounts against real data.

## Resolved demo assumptions

- Supplied dealer prices are per piece, GST-inclusive demo totals. No GST rate is invented and no tax invoice produced. UI says GST included; TDD must identify this assumption.
- Orders are whole cases only. Per-piece prices are informational; pack count determines case price. No silent conversion of ambiguous AI input.
- Buy 10 biscuit cases get 1 free repeats: floor(paid cases / 10); free cases are the same SKU and consume inventory. No stacking.
- At five or more paid detergent cases, 3% off the full detergent line, rounded once to nearest paise (half up). No other implicit volume discounts.
- Confirmation atomically decrements paid plus free stock; competing/duplicate submissions cannot oversell or double-charge stock. Cancellation restores inventory once. No money is collected.
- Confirmed order prices, pack sizes, tax convention and scheme results are snapshots. Catalogue changes never recalculate past orders.
- States: confirmed -> processing -> packed; confirmed -> cancelled. Desk-only transitions; cancelled/packed are terminal in this slice. Retailer may view but cannot change status. Human confirmation occurs before creation.
- Synthetic additional catalogue products, retailers, histories and brand names support demonstrations. Three source SKUs retain their provided values. Four fictional brands: Rozana, Ujala Home, Pahadi, Gharana. No link to similarly named real businesses is implied.

## Tally export boundary

The desk selects an order by opening its detail page. Packed orders can be downloaded as a UTF-8 staging CSV, one row per saved line. Prices, quantities, free goods and discounts come from the saved quote. Order references stay stable on repeat downloads. Downloads leave stock and order status untouched.

| CSV columns                                 | Suggested mapping for the target company                                                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| OrderReference, OrderDateIST                | Group rows into one Sales Order by reference. Use the IST order date.                                                                       |
| PartyReference, PartyName                   | Resolve to an existing party ledger using the company's mapping.                                                                            |
| StockItemReference, StockItemName           | Resolve to an existing stock item using its SKU mapping.                                                                                    |
| PiecesPerCase, PaidCases, FreeCases         | Use the company's unit mapping. In piece units, delivered quantity is (paid cases + free cases) × pieces per case. Bill only paid quantity. |
| UnitPriceINR, GrossINR, DiscountINR, NetINR | Per-piece price and saved gross, discount and net line values in INR. Preserve totals when allocating the scheme and free goods.            |

Use an Excel worksheet and a company-specific transaction mapping when validating in TallyPrime. Confirm the Sales Order voucher type, party and stock masters, units, free-goods treatment, sales ledger and tax allocations with the target company first. The CSV contains no tax breakout or company ledger IDs. A repeat download can be reconciled by order reference. External duplicate-import behavior must be verified in the target company. [TallyPrime transaction mapping](https://help.tallysolutions.com/how-to-manage-mapping-templates-for-importing-data/).

## AI boundary

The capture endpoint uses a configurable Ollama model and validates structured responses. Source phrases must appear verbatim in the message. Only catalogue SKU IDs can become suggestions. The latest 20 non-cancelled orders provide retailer-specific context. Desk aliases use normalized product phrases and apply only to that order's retailer. A unique alias match is ranked first as a suggestion for human review. Confidence is a qualitative model estimate. The capture endpoint returns a draft without writing orders.

## Upstream implementation references

- https://vite.dev/guide/ (Node requirements)
- https://nodejs.org/download/release/v22.23.3/docs/api/sqlite.html (SQLite API)
- https://expressjs.com/en/5x/guide/error-handling/ (async error handling)
