# Peti interaction contract

## Business-context sources

PROJECT_PLAN.md owns scope; docs/DECISIONS.md resolves implementation assumptions. User-supplied brief owns permissions: retailer sees own prices/orders; desk sees all. No salesman role yet. Financial data is synthetic; no external side effects or payment collection. Records are not deleted through the UI.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Form | src/components/ui.tsx Field / Button | This contract | sign-in, quantity | tests/e2e/foundation.spec.ts |
| Scrollbar | src/styles.css global baseline | DESIGN.md | table geometry only | browser computed style |
| Toast | src/components/ui.tsx Notice | This contract | inline success/error/info; no transient toast | browser feedback |
| CRUD | server/app.ts and src/api.ts | docs/DECISIONS.md | create order, status update | tests/api.test.ts |
| Select/Listbox | native select if introduced | This contract | browser-owned popup | browser keyboard checks |

No selection table, date picker or modal in this phase; no equivalent local owners permitted.

## Flow ledger

Sign-in: email -> request demo code -> visible mock-delivery panel -> verify -> role home. Code errors preserve email and code input; expired code can be replaced. Sign-out revokes server session and clears client private state. No automatic order placement.

Cart: editable local draft scoped to signed-in retailer. Totals are requested from server, never trusted from the browser. Create order is pessimistic, idempotent and explicitly confirmed on cart review. Success opens the persisted order detail. Failure preserves the draft and explains correction. Status transitions are explicit desk actions. No cancellation until a deliberate review action.

## Dataset navigation

Catalogue: server search/category filter with page size 12; explicit page controls. Orders: bounded server pagination, 12 per page. Filters and page stored in URL; page resets on filter change. Search is submitted explicitly (no race-prone autocomplete); uncommitted text stays in the field. Preserve results geometry during loading. Empty catalogue, no-results and service failures have different copy and recovery.

## Validation and async resilience

Zod schemas on server; inline form errors and visible summary, no browser dialogs. Forms use noValidate. First invalid field receives focus. Mutation buttons remain the same size and block duplicate activation. Fetch requests time out and aborted/stale results cannot overwrite newer requests. An expired session returns to sign-in; no local private state survives logout. Cart persistence is not promised in phase 1. Offline writes are blocked honestly; no offline salesman mode yet.

## Navigation and accessibility

React Router owns routes, document titles and active links. Route change focuses the main heading. Native buttons/links, labelled inputs and aria-live status regions; text accompanies semantic colours. English and Hindi toggle is stored as a preference and updates document lang. Currency uses en-IN/hi-IN with INR. 44px controls, mobile reflow, visible keyboard focus, skip link and reduced motion. Desk tables scroll horizontally, retaining all columns.

## Verification

Required: format:check, typecheck, test, build, tokens:check, test:e2e and premium static audit. Browser evidence must cover two roles, mobile, English/Hindi, denied cross-retailer access, form validation, no-results and failure/retry. Compare catalogue and desk for shared navigation, buttons and status behaviour. Static compliance is not proof of runtime accessibility.
