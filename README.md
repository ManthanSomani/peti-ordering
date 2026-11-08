# Peti — retailer ordering

A full-stack take-home for the FMCG distributor brief. **Current milestone: foundation and manual ordering. Not submission-ready yet.**

## Working now

- Simulated OTP sign-in for two isolated retailers and the order desk; hashed server sessions, expiry, attempt limits and logout.
- Responsive English/Hindi catalogue, fictional original product illustrations, explicit case/pack/per-piece pricing, availability, search and filters.
- Server-priced cart, repeating buy-ten-get-one scheme and three-percent threshold discounts.
- Transactional stock checks, idempotent confirmation, immutable pricing snapshots and per-retailer data isolation.
- Order history and desk processing/packing with persisted events.
- Automated pricing/API/browser/accessibility checks.

## Not implemented yet

Optional offline/photo/voice features, hosted deployment, public GitHub remote, final PDF/Word TDD and submission ZIP remain pending. Cart is currently in memory and is cleared on refresh or sign-out.

Desk staff can cancel a confirmed order or process and pack it. Open a packed order to download its CSV for Tally mapping. The company-specific Tally import still needs validation.

Message capture and retailer-specific aliases are implemented. The full assignment message passed a live Chrome walkthrough using Ollama and Qwen 2.5 3B on CPU. Configure Ollama using `deployment.md` to try capture.

## Run locally

Requires Node.js 22.13+ (developed on 22.22) and npm.

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Open http://localhost:3000. Seed/migration runs on startup when `DEMO_MODE=true`. The database persists at `data/peti.sqlite` and is ignored by Git. Existing files are never reset automatically. To get a fresh demo, set DATABASE_PATH to a new file; keep the old one if you want its orders.

Use `sharma@peti.demo`, `verma@peti.demo` or `desk@peti.demo`. Request a code, then enter the six digits shown in the simulated delivery panel. No actual email/SMS is sent. All identities are fictional; never enable this authentication mode against real data.

```powershell
npm run build
npm start
```

Production assets and API use one process. Hosting requires a persistent filesystem volume for SQLite and HTTPS with secure cookies. The local server binds to loopback; HOST can be configured for deployment. This is not a deployed or scaled multi-instance service.

## Checks

```powershell
npm run format:check
npm run tokens:check
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Browser tests use installed Google Chrome and launch an isolated app on port 3100 with a fresh, separate SQLite database. Screenshots are saved under ignored `artifacts/`. The tests do not mutate your normal demo database. Native SQLite is experimental in Node 22; the warning is expected.

## Structure

- `server/`: schema/seed, session authentication, validation, authorisation and transactional routes.
- `shared/`: types and deterministic scheme calculations.
- `src/`: React screens, shared controls, localization and generated design tokens.
- `tests/`: domain/API tests and Chrome walkthroughs with axe accessibility checks.
- `docs/DECISIONS.md`: architecture, sample-data assumptions, export/AI boundaries.
- `PROJECT_PLAN.md`: requirement IDs, phases and final submission checklist.
- `DESIGN.md` / `UX-CONTRACT.md`: visual and interaction contracts.

## Important assumptions

Source dealer prices are treated as per-piece, GST-inclusive values; ordering is case-only. The brief does not specify these conventions. No statutory tax rate or tax invoice is invented. Historical seeded orders are synthetic; provided inventory is available stock after those existing orders. Additional products/brands are invented for demonstration. Business savings and performance targets have not been proven by this demo.

Stack references: [Vite](https://vite.dev/guide/), [Node SQLite](https://nodejs.org/download/release/v22.23.3/docs/api/sqlite.html), [Express error handling](https://expressjs.com/en/5x/guide/error-handling/).
