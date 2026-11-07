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

## Tally boundary (future phase)

No Tally version or company ledger mapping is supplied. Export will have a typed adapter and a documented fixture; integration may be mocked under the brief. Until a target format and mapping are implemented/tested, no Tally compatibility claim and no export UI action.

## AI boundary (future phase)

No provider selected/configured in this foundation. There is no fake extraction endpoint. Catalogue/order flow works independently. Extraction will produce drafts, not write orders; server validation and human confirmation remain mandatory. Select API provider and credentials in Phase 3, with source-linked fields and honest confidence labels.

## Upstream implementation references

- https://vite.dev/guide/ (Node requirements)
- https://nodejs.org/download/release/v22.23.3/docs/api/sqlite.html (SQLite API)
- https://expressjs.com/en/5x/guide/error-handling/ (async error handling)
