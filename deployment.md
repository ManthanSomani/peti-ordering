# Deployment instructions — working draft

The [public GitHub repository](https://github.com/ManthanSomani/peti-ordering) is available. The Docker Compose demo was verified locally with live AI capture, checkout, CSV export and a container restart.

## Prerequisites

For the container demo, use Docker with Compose and a running Linux container engine. Internet access is needed for the first build and model download. Follow the Docker steps below, or use the native setup if you prefer running Node and Ollama directly.

- Node.js 22.13 or newer; Node 22.22 was used for development.
- npm and a writable local filesystem.
- Google Chrome to run browser tests (not needed to run the app).

## Docker demo

From the repository root, run:

```sh
docker compose up --build
```

Open [Peti on localhost](http://localhost:3000) once the app logs that it is running. Use the demo accounts listed below. Compose starts Ollama, downloads Qwen 2.5 3B if needed, then starts Peti. The first run downloads the base images, npm packages and approximately 1.9 GB of model data. Inference runs on CPU and cold model loading can take longer than subsequent requests. The app uses the internal Ollama endpoint without API credentials.

On x86-64, the Ollama image checked during development adds about 3.4 GB of compressed downloads. Allow several gigabytes of additional disk space for unpacked image layers. If you already have Ollama and the model installed on your machine, the native setup below can reuse them.

Run `docker compose down` to stop the demo. Named volumes retain the database and the model for the next run. If port 3000 is occupied, set `PETI_PORT` to an available port before starting Compose and open that port on `localhost`.

## Native local setup

1. Obtain the repository and open its root directory.
2. Run `npm ci`.
3. Copy `.env.example` to `.env` (`Copy-Item .env.example .env` in PowerShell).
4. Run `npm run dev`.
5. Open `http://localhost:3000`.

Startup creates the database schema and applies version 1 if missing. Demo mode seeds two retailer accounts, a desk account, eight products and two historical sample orders only when the users table is empty. Restarts retain all changes. For an independent fresh demo, point DATABASE_PATH to a new filename rather than deleting existing work.

## Built app

Run `npm run build`, then `npm start`. Assets are served from `dist/` by the same server as the API. A deployed SQLite app requires a persistent volume and a single writer instance; ephemeral serverless storage is unsuitable. Configure the actual HTTPS origin, enable secure cookies, and configure HOST for the hosting network. No infrastructure has been provisioned.

## Railway deployment plan

1. Create one service from the GitHub repository. The Dockerfile builds the UI and runs the existing Express server. Railway reads the health-check path and single replica setting from `railway.toml`.
2. Attach a persistent volume at `/data` and set `DATABASE_PATH` to a SQLite file inside it. Use a fresh hosted database for the synthetic demo.
3. Generate an HTTPS domain, set `APP_ORIGIN` to that exact origin and enable `COOKIE_SECURE`. Enable `DEMO_MODE` for the seeded reviewer accounts. Railway supplies `PORT` and the container listens on all interfaces.
4. Verify the health endpoint and sign in as both roles. Place a test order, pack it, download the CSV, then confirm the data survives a restart.

The Docker demo is the verified reviewer setup. A public AI deployment would require a reachable inference service. The optional Railway plan above is unverified.

Railway references: [persistent volumes](https://docs.railway.com/volumes) and [deployment configuration](https://docs.railway.com/config-as-code/reference).

## Environment variables (names only)

- `PORT`: HTTP listening port.
- `HOST`: listening interface; defaults to loopback locally.
- `APP_ORIGIN`: exact allowed browser origin for mutations.
- `DATABASE_PATH`: private SQLite database path on persistent storage.
- `DEMO_MODE`: explicitly enables synthetic account seeding and simulated OTP delivery.
- `COOKIE_SECURE`: enables HTTPS-only session cookies.

- `OLLAMA_MODEL`: installed local model used for message extraction. Omit to disable extraction.
- `OLLAMA_URL`: optional Ollama service URL. Defaults to the local Ollama endpoint.
- `PETI_OLLAMA_CPU`: set to `1` to use CPU inference. This was required for the verified Windows run after GPU inference timed out.

Start Ollama and install a model that supports structured output before setting the model name in your local environment. The server sends message text and product descriptions to this service. Use synthetic messages for the demo. [Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs).

Run the opt-in live acceptance test from PowerShell once Ollama is running and the chosen model is installed. Replace the model name if needed.

```powershell
$env:OLLAMA_MODEL = 'qwen2.5:3b'
$env:PETI_OLLAMA_CPU = '1'
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

The target-company Tally import test, hosted deployment and final TDD are pending. The app uses demo OTP delivery and in-memory cart drafts. The compressed production build reached a 4.545-second median in the local slow-3G simulation, above the three-second target. See docs/PROGRESS.md for the measurement conditions.
