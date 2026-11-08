# Deployment instructions — working draft

Status: local application only. No hosted URL or public GitHub remote yet. This draft is not the final submission package.

## Prerequisites

- Node.js 22.13 or newer; Node 22.22 was used for development.
- npm and a writable local filesystem.
- Google Chrome to run browser tests (not needed to run the app).

## Local setup

1. Obtain the repository and open its root directory.
2. Run `npm ci`.
3. Copy `.env.example` to `.env` (`Copy-Item .env.example .env` in PowerShell).
4. Run `npm run dev`.
5. Open `http://localhost:3000`.

Startup creates the database schema and applies version 1 if missing. Demo mode seeds two retailer accounts, a desk account, eight products and two historical sample orders only when the users table is empty. Restarts retain all changes. For an independent fresh demo, point DATABASE_PATH to a new filename rather than deleting existing work.

## Built app

Run `npm run build`, then `npm start`. Assets are served from `dist/` by the same server as the API. A deployed SQLite app requires a persistent volume and a single writer instance; ephemeral serverless storage is unsuitable. Configure the actual HTTPS origin, enable secure cookies, and configure HOST for the hosting network. No infrastructure has been provisioned.

## Environment variables (names only)

- `PORT`: HTTP listening port.
- `HOST`: listening interface; defaults to loopback locally.
- `APP_ORIGIN`: exact allowed browser origin for mutations.
- `DATABASE_PATH`: private SQLite database path on persistent storage.
- `DEMO_MODE`: explicitly enables synthetic account seeding and simulated OTP delivery.
- `COOKIE_SECURE`: enables HTTPS-only session cookies.

No AI key is needed for this milestone because AI extraction is not implemented. This section must be updated when an actual provider is integrated. Never commit `.env`, database files, API credentials or real personal data.

## Reviewer access

The deliberately public fictional demo accounts are:

- `sharma@peti.demo`: retailer, source sample prices.
- `verma@peti.demo`: second retailer, distinct prices to demonstrate isolation.
- `desk@peti.demo`: office order desk.

Choose an account, request the six-digit code, then enter the code shown in the demo panel. Codes expire after five minutes and allow at most five verification attempts. No SMS/email is sent. Server permissions remain real; simulated delivery must not be used for real users.

## Verification

`npm test` runs scheme/API checks. `npm run test:e2e` requires a built app and installed Chrome; it starts an isolated database/server on port 3100. Run `npm run format:check`, `npm run typecheck`, `npm run tokens:check` and `npm run build` before packaging.

## Limitations for this draft

AI capture, retailer-specific aliases, Tally export, hosted deployment and final TDD are still pending. UI cancellation and draft recovery are not implemented. Slow-3G three-second first-load target is not yet measured. No production scale, real SMS or accounting compatibility claim is made.
