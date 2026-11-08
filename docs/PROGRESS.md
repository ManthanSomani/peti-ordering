# Progress and verification

## Foundation milestone — complete locally

The repository now has a runnable React/TypeScript frontend, Express API, SQLite schema and repeatable synthetic seed. Demo OTP login, hashed sessions, retailer/desk role boundaries and cross-retailer isolation work. The eight product catalogue uses all three supplied SKUs unchanged plus five explicitly synthetic variants. Desktop and mobile screens share a bilingual visual system documented in DESIGN.md and UX-CONTRACT.md.

Manual ordering also works: the backend prices a cart, applies the two required schemes, checks stock including free cases, confirms atomically with an idempotency key, stores a price snapshot, and displays orders to the appropriate retailer and desk. Desk staff can move an order from confirmed to processing to packed. These operations are persisted and tested.

The brief's uncertain money conventions are recorded in docs/DECISIONS.md and shown in the UI: supplied dealer prices are assumed per piece and GST inclusive; ordering is by whole case. This is a demo convention, not verified distributor pricing policy.

## Verification recorded

- `npm run format:check` — passed after formatting correction.
- `npm run tokens:check` — passed.
- `npm run typecheck` — passed.
- `npm test` — 19 tests passed. Includes role isolation, auth expiry/reuse, scheme thresholds, stock accounting, idempotency, price snapshots and status transitions.
- `npm run build` — passed.
- `npm run test:e2e` — 3 Chrome walkthroughs passed. Covers retailer-to-desk flow, mobile Hindi layout, empty/error/retry states, sign-in validation and axe accessibility checks on catalogue views.
- Frontend Design Premium strict static audit — zero findings.
- DESIGN.md validator — zero errors; colour-token orphan warnings reflect that the validator cannot infer direct CSS consumers. The one invalid component sub-token warning was corrected.
- Desktop and mobile Hindi screenshots were inspected from automated browser runs. They are ignored review artifacts under `artifacts/`.

## Remaining before submission

Phase 3: actual text AI extraction, catalogue-grounded matching, uncertainty review and scoped correction aliases. Phase 4: order-desk export with a documented Tally boundary. Then performance measurement, final quality pass, hosted deployment if chosen, public remote repository, PDF/Word TDD and two-file ZIP. These are incomplete and are not represented in the UI as working features.

Known current limits: cart draft lives in browser memory; refreshing loses it. The OTP is intentionally displayed on screen in demo mode. SQLite requires a persistent volume for a hosted deployment and Node 22's built-in driver is experimental. No production load or slow-3G target has been measured. Order cancellation is implemented and API-tested but has no UI control.
