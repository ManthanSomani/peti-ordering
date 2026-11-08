# Peti Technical Design Document

Working manuscript for the submission document. Insert the public GitHub URL at the top and the hosted URL if deployed before generating the final PDF or Word file.

## Scope

Peti is a bilingual ordering demo for FMCG retailers and an office order desk. A retailer can browse a catalogue or paste an informal order message, review the items and quantities, and confirm a priced order. Desk staff can process the order and export a packed order for Tally field mapping. The demo uses synthetic shops and stock.

## Architecture

React and TypeScript render the retailer and desk interfaces. One Express service serves the built frontend and API on the same origin. This keeps cookies, routing and deployment together. SQLite stores the catalogue, sessions and orders. One service instance owns writes and uses a persistent volume when hosted. The local demo can run with no database account.

## Data and order workflow

Users belong to a retailer or the desk. Products store SKU, bilingual names, pack size, stock and scheme. Retailer prices are scoped to the signed-in retailer. The cart quote calculates money in integer paise, checks paid and free case quantities, and returns a price breakdown. The server creates the order and decrements stock in one transaction. An idempotency key makes repeated submissions safe. The saved quote captures prices, discounts and quantities at confirmation time. Desk status changes are logged as order events, and cancelling a confirmed order returns its reserved stock.

## Message capture and review

The server sends indexed message fragments, catalogue metadata and recent retailer SKUs to Ollama. It validates the structured output and maps indexes back to the original text. Missing fragments remain visible for review. The server checks explicit pack sizes within the suggested product family and recognizes explicit whole-case counts. Desk staff can teach an alias for a product, scoped to that retailer. The reviewer must select a product and confirm the number of cases. The cart then uses the same stock and scheme checks as manual ordering.

## Interface decisions

The catalogue emphasizes stock, pack size and case price. Mobile screens use large controls and preserve the retailer’s language preference. The review screen keeps the original phrase visible so the retailer can resolve wrong or uncertain suggestions. The desk uses order status and a detail view to separate packing, cancellation and export. Loading, empty, failure and retry states were exercised in Chrome.

## Access and export

Demo OTP delivery is simulated. Server sessions use random tokens with hashes stored in SQLite and cookies configured for HTTPS on a hosted deployment. The API enforces role and retailer scope. The desk exports a UTF-8 staging CSV from a packed order. It includes the order and party references, stock items, paid and free cases and saved money amounts. A target-company Tally import requires ledger, item and unit mappings and remains unverified.

## Assumptions and verification

Dealer prices are per piece and include GST for the demo. Orders use whole cases. Free cases consume available stock and discounts are rounded in paise. The application does not generate a statutory tax invoice.

The production build, 21 domain and API tests and four standard Chrome walkthroughs passed. The live Hinglish sample passed with Qwen 2.5 3B on CPU in 22 seconds. It suggested the expected products, blocked unavailable tea and reached checkout without creating an order. GPU inference timed out on the test machine. Under simulated slow 3G at 400 kbps and 400 ms latency, compression reduced the median cold catalogue time from 9.14 to 4.55 seconds. This remains above the three-second target.

Offline sales mode, photo and audio capture and live messaging are outside the delivered scope. The draft cart is in memory. The final deployment instructions explain reviewer access, the local AI setup and the hosted verification status.
