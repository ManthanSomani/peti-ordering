# Peti deployment and reviewer guide

[Public GitHub repository](https://github.com/ManthanSomani/peti-ordering)

Peti runs locally through Docker Compose. The Compose demo includes the SQLite database and Ollama inference. It uses fictional accounts and requires no AI API key.

## Start the demo

1. Install Docker with Compose and start its Linux container engine. Allow internet access for the first build and several gigabytes of disk space for images and the model.
2. Clone the project and start Compose from a regular terminal.

   ```sh
   git clone https://github.com/ManthanSomani/peti-ordering.git
   cd peti-ordering
   docker compose up --build
   ```

3. Open [Peti on localhost](http://localhost:3000) when the app starts. Compose waits for Ollama to be healthy and for model setup to finish. A successful model setup exits with code 0. The first startup downloads the Ollama image and roughly 1.9 GB of model data. CPU inference can take tens of seconds on the first request.

If port 3000 is occupied, set `PETI_PORT` to a free port before starting Compose and open that port on localhost. For example, in PowerShell:

```powershell
$env:PETI_PORT = '3200'
docker compose up --build
```

Run `docker compose down` to stop the demo. The named volumes retain orders and model data for the next run.

## Check and troubleshoot the stack

1. Run `docker compose ps` to check that Peti is running and Ollama is healthy.
2. Open [the health endpoint](http://localhost:3000/api/health) to check the app. Use the same port override as the app if you changed it.
3. If Docker cannot connect to its engine, start or resume Docker Desktop, then rerun Compose. If Peti fails to start, inspect `docker compose logs peti` and `docker compose logs model`. For an AI timeout after startup, check `docker compose logs ollama` and retry once the model has loaded.
4. If you edited the app and want to run the new build, rerun `docker compose up --build` from the project root. Keep the named volumes to retain existing orders and avoid downloading the model again.

## Demo sign-in

| Account            | Role and use                               |
| ------------------ | ------------------------------------------ |
| `sharma@peti.demo` | Retailer with the source sample prices     |
| `verma@peti.demo`  | Retailer with distinct demo prices         |
| `desk@peti.demo`   | Desk staff with inbox, workflow and export |

Choose an account and request a code. Enter the six-digit code displayed in the demo panel. The code expires after five minutes. Delivery is simulated and requires no email or SMS access.

## Suggested review

1. As Sharma, add 10 biscuit cases and 5 detergent cases. Review one free biscuit case and a 3% detergent line discount at checkout. Confirm the order.
2. As the desk, open that order, move it to processing and packed, then download its Tally staging CSV.
3. On **Order desk**, choose **Export all orders CSV** beside **Refresh**. The report contains one row per order across all statuses and pages, independent of the active filter.
4. In **Message inbox**, choose **Simulate incoming message**. Select Sharma and choose **Draft from message**. Review the suggested products and quantities, skip unavailable tea, review price and stock, then explicitly confirm. The message links to the saved order.

## Native setup

1. Install Node 22.13 or newer, npm and Ollama. Start Ollama, then run `ollama pull qwen2.5:3b`.
2. From the project root, run `npm ci` and copy `.env.example` to `.env`. Set `OLLAMA_MODEL` to the installed model name. Enable CPU inference using `PETI_OLLAMA_CPU` if GPU inference times out.
3. Run `npm run dev` and open [Peti on localhost](http://localhost:3000). For a production build, stop the dev process, then run `npm run build` followed by `npm start`.

Startup migrates the database and seeds fictional data when demo mode is enabled and the users table is empty. To start an independent demo, use a fresh file for `DATABASE_PATH`.

## Environment variables

| Name              | Purpose                                 |
| ----------------- | --------------------------------------- |
| `PETI_PORT`       | Override the Compose host port          |
| `PORT`            | App listening port                      |
| `HOST`            | App listening interface                 |
| `APP_ORIGIN`      | Exact browser origin allowed for writes |
| `DATABASE_PATH`   | Private SQLite file path                |
| `DEMO_MODE`       | Enable fictional data and simulated OTP |
| `COOKIE_SECURE`   | Restrict the session cookie to HTTPS    |
| `OLLAMA_MODEL`    | Installed model for text extraction     |
| `OLLAMA_URL`      | Ollama service URL                      |
| `PETI_OLLAMA_CPU` | Enable CPU inference                    |

Compose supplies the app settings. Keep local environment files, credentials, database files and real personal data out of Git.

## Verification and deployment boundary

Run `npm test` for domain and API checks. Build the app before running `npm run test:e2e` with Chrome installed. By default, the browser suite uses a separate seeded database. Set `PETI_LIVE_CAPTURE` to enable the two live model tests after configuring Ollama. Set `PETI_PERF` to enable the network benchmark.

The verified delivery is local Docker Compose. A hosted installation would require a reachable inference service, one SQLite writer with a persistent volume and HTTPS cookie configuration. The packed-order CSV is for Tally staging. Import into the target Tally company requires validation of its ledger, unit and item mappings.
