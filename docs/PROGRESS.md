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

Phase 3 implementation is in place. The build, 20 domain/API tests and four Chrome walkthroughs passed, including catalogue grounding, alias isolation and explicit quantity review. Capture checks use a fixture model response. The remaining Phase 3 gate is running the assignment's full sample against a configured live model and inspecting its suggestions.

Live verification was attempted on 8 November 2026. Both Windows installer attempts and the official standalone download returned HTTP 504. The opt-in browser test and commands in deployment.md are ready for a machine with Ollama and a model installed. The Phase 3 completion box remains open until that test passes.

Phase 4 is complete locally. The desk can cancel a confirmed order with explicit confirmation, or process and pack it before downloading a staging CSV. The build, 21 domain/API tests and four Chrome walkthroughs passed. The export checks cover saved scheme values, formula escaping, rejection of invalid or cancelled orders, actual browser download and retailer access denial. Target-company Tally import requires the mappings in DECISIONS.md.

Phase 5 verification is complete locally. Chrome exercised a 360px retailer checkout through desktop desk packing and CSV download, catalogue retry and empty states, English/Hindi layout and axe checks, keyboard sign-in, and role isolation. The tests use a separate seeded database. Environment files and SQLite files are excluded from Git.

The opt-in cold catalogue benchmark uses the production server, an authenticated retailer, a 360 × 800 viewport, disabled browser cache, 400 ms latency and 400 kbps upload/download in Chrome. It measures navigation start to the first enabled Add button. No CPU throttling was applied.

| Build        | Three runs                | Median  |
| ------------ | ------------------------- | ------- |
| Uncompressed | 9.071 s, 9.138 s, 9.147 s | 9.138 s |
| Compressed   | 4.378 s, 4.550 s, 4.545 s | 4.545 s |

The three-second target was missed in this simulation. The result applies to the local production build under the stated test profile. Hosted performance and physical-device performance still need measurement. Run the benchmark with `PETI_PERF=1` and `npm run test:e2e -- -g "cold mobile catalogue benchmark"` after building.

Phase 6 covers deployment if chosen, public repository, TDD and submission ZIP.

The cart draft lives in browser memory and refreshing clears it. The OTP is displayed on screen in demo mode. SQLite requires a persistent volume for hosted deployment. Production load still needs measurement.
