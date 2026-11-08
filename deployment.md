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

- `OLLAMA_MODEL`: installed local model used for message extraction. Omit to disable extraction.
- `OLLAMA_URL`: optional Ollama service URL. Defaults to the local Ollama endpoint.

Start Ollama and install a model that supports structured output before setting the model name in your local environment. The server sends message text and product descriptions to this service. Use synthetic messages for the demo. [Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs).

Run the opt-in live acceptance test from PowerShell once Ollama is running and the chosen model is installed. Replace the model name if needed.

```powershell
$env:OLLAMA_MODEL = 'qwen2.5:3b'
$env:PETI_LIVE_CAPTURE = '1'
npm run build
npm run test:e2e -- -g "live model captures"
```

This test uses an isolated demo database. It checks all three expected SKU suggestions, the unavailable tea, manual confirmation of case counts and that opening checkout creates no order.

Never commit `.env`, database files, API credentials or real personal data.

## Reviewer access

The deliberately public fictional demo accounts are:

- `sharma@peti.demo`: retailer, source sample prices.
- `verma@peti.demo`: second retailer, distinct prices to demonstrate isolation.
- `desk@peti.demo`: office order desk.

Choose an account, request the six-digit code, then enter the code shown in the demo panel. Codes expire after five minutes and allow at most five verification attempts. No SMS/email is sent. Server permissions remain real; simulated delivery must not be used for real users.

## Verification

`npm test` runs scheme/API checks. `npm run test:e2e` requires a built app and installed Chrome; it starts an isolated database/server on port 3100. Run `npm run format:check`, `npm run typecheck`, `npm run tokens:check` and `npm run build` before packaging.

## Limitations for this draft

The live model walkthrough, target-company Tally import test, hosted deployment and final TDD are pending. The app uses demo OTP delivery and in-memory cart drafts. The compressed production build reached a 4.545-second median in the local slow-3G simulation, above the three-second target. See docs/PROGRESS.md for the measurement conditions.
