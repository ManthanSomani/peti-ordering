# FMCG retailer ordering — development and delivery plan

Status: foundation, manual ordering and desk export complete locally. AI capture is implemented and its live model check remains open. See docs/PROGRESS.md for verification evidence.
Source: the assignment brief and Problem 2 supplied by the user in this chat.
Selected project: FMCG distributor's retailer ordering app with AI order capture.

## 1. Outcome and scope

Build a working full-stack product for a fictional distributor in Jabalpur serving 1,800 kirana shops across four packaged-food and home-care brands. Make it easy to create an accurate order from a catalogue or an informal Hindi/English/Hinglish message, verify it, and process it at an office desk.

Primary journey:
Sign in -> catalogue or pasted message -> review/clarify items -> priced cart -> explicit confirmation -> persisted order -> desk processing -> export.

The CORE BUILD determines mandatory implementation scope. The wider MUST HAVE list provides optional depth; it does not make the core's security, design, or AI safeguards optional.

Do not build payment collection, delivery tracking or GST e-invoicing. Do not assume live WhatsApp, SMS or Tally access: external systems may be mocked, and every mock must be labelled honestly.

The brief's Rs 7 lakh / six weeks describes the hypothetical client engagement, not the candidate's budget or submission allowance. The assignment gives seven days from opening; the supplied screenshot shows 9 November 2026, 11:59 pm IST. Confirm the actual portal deadline before submission. Phases below are completion gates, not a promise to fit seven new days into the remaining window.

## 2. Deliverables

### Working product and repository

- Frontend, backend, persistent database, sign-in, retailer and order-desk roles.
- Realistic synthetic seed data, including all three supplied SKUs.
- Important logic and access-control tests; no dead controls.
- Public GitHub repository available through review, with incremental, truthful commit history.
- Live deployment is strongly desirable for review, but the brief permits a local runnable app without one. Describe deployment status accurately.
- No real personal data, committed credentials, or real business documents.

### Final upload: one ZIP, at most 25 MB, containing exactly two files

1. Technical Design Document, PDF or Word:
   - GitHub project URL at the top; live app URL if deployed.
   - Architecture and rationale; data model; main flows; AI implementation and safeguards.
   - UI decisions and key screens.
   - Explicit assumptions, scope cuts, limitations and next steps.
   - Validation evidence and distinction between implemented features and future design.
2. `deployment.md`:
   - Reproducible local setup, dependencies, database migration and seed instructions.
   - Actual deployment method/status.
   - Environment variable names and purpose, never secret values.
   - Reviewer demo access instructions. Only isolated, intentionally public demo accounts/codes; never infrastructure credentials or private user accounts.

Source code lives in GitHub; do not put the whole repository in the submission ZIP. Allow resubmission before the deadline and verify the latest upload.

## 3. Required acceptance criteria

| ID  | Requirement              | Evidence of completion                                                                                                                                     |
| --- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R01 | Authentication and roles | Retailer and desk can sign in; backend enforces permissions.                                                                                               |
| R02 | Retailer catalogue       | Product images, pack sizes, retailer prices, current schemes and availability are readable on mobile.                                                      |
| R03 | Cart and order           | Server computes prices, validates units/stock and saves an order only on explicit human confirmation.                                                      |
| R04 | Scheme engine            | Free goods and quantity discounts apply predictably at thresholds; breakdown is visible and tested.                                                        |
| R05 | Actual AI text capture   | Real model-assisted extraction of supplied-style messages into structured proposals; not a canned response.                                                |
| R06 | Uncertainty handling     | Each extracted line retains original words, confidence and two alternative SKU suggestions where valid candidates exist; unclear units block confirmation. |
| R07 | Context and correction   | Matching uses retailer history and scoped aliases; authorised desk corrections can become aliases for that retailer.                                       |
| R08 | Order desk               | Authorised staff can inspect orders, handle issues and make supported state changes; retailer can see the resulting order status.                          |
| R09 | Tally export boundary    | A downloadable, documented export works; fixture/contract validation is recorded. Do not claim verified Tally import unless actually tested.               |
| R10 | Privacy                  | Retailers cannot access another retailer's prices, credit, orders, aliases or exports by changing IDs or calling APIs.                                     |
| R11 | Language and UX          | Hindi/English UI for core journeys, large tap targets, consistent responsive design, loading/empty/error states.                                           |
| R12 | Price clarity            | Price unit, case size, scheme savings and GST inclusion/exclusion are explicit and consistent.                                                             |
| R13 | Performance              | Measure first-load behaviour under documented slow-3G/mobile conditions against the brief's under-three-second target. Report actual results.              |
| R14 | Seeded demonstration     | All provided SKUs plus clearly labelled synthetic examples support success, ambiguity, scheme and out-of-stock paths.                                      |
| R15 | Submission               | Public repo link, TDD and deployment instructions are complete and final ZIP is checked.                                                                   |

When fewer than two valid alternatives exist, show the available candidates and explain the limit; do not invent or pad suggestions with unrelated products. Expand synthetic catalogue deliberately to demonstrate meaningful alternatives, and disclose additions.

## 4. Optional depth and exclusions

Only add after required acceptance criteria are satisfied:

1. Repeat order, credit display and desk credit holds.
2. Installable PWA and simulated OTP delivery; preserve secure role/session enforcement regardless of login approach.
3. Van loading list and retailers inactive for 14 days.
4. Image and Hindi audio capture.
5. Salesman role, assigned-retailer access and offline orders with safe synchronisation.

Low-effort optional features may move earlier if they simplify a core workflow; do not let them displace required quality. External notification delivery can remain mocked. Live WhatsApp integration is not required by text capture: pasted messages satisfy the input boundary.

## 5. Proposed screen map (eight screens)

1. Sign-in: seeded demo access and language selection.
2. Retailer catalogue: prices, packs, stock and schemes, with quick add.
3. Text capture: paste message, clear processing/error/retry states.
4. Extraction review: original phrase, proposed SKU, confidence, alternatives, quantity and unit clarification.
5. Cart: editable quantities, free goods, discounts, GST label, errors and explicit confirmation.
6. Order detail: confirmed totals, item breakdown and current status; role-appropriate desk actions.
7. Desk queue: searchable/filterable orders and issues.
8. Export review: selected orders, validation feedback and downloadable export.

Shared screens can support different authorised views. Extra controls must have implemented behaviour. Desktop desk tables and mobile retailer flows should share a coherent design language without forcing identical layouts.

## 6. Architecture boundaries to settle in Phase 1

- Prefer a simple full-stack application and relational database; exact framework, auth, hosting and AI provider are not selected yet.
- The server owns permissions, prices, discounts, stock and order state. Never trust client totals or retailer IDs.
- The AI proposes structured order lines; it cannot place orders, invent catalogue IDs, set prices or bypass validation.
- Keep costing/schemes in a pure deterministic domain module with integer minor-unit or exact-decimal arithmetic.
- Separate model extraction/matching, domain validation, order persistence and export adapters.
- Persist order-line price/scheme/tax snapshots so historical orders do not change when catalogue rates change.
- Confirm orders atomically with appropriate stock checks and an idempotency key to prevent duplicate submissions.
- Keep external adapters replaceable and make simulated operations visibly distinct from actual integrations.

Proposed data entities: users, retailers, user-to-retailer memberships, products/SKUs, retailer prices, inventory, schemes, retailer aliases, capture drafts/lines, orders/lines, order events and export runs. Add credit records only with the credit feature. Final schema and state transitions must be documented before implementation.

## 7. Assumption register — provisional, not established client facts

| ID  | Proposed decision / unresolved issue                                                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A01 | Dealer prices are tentatively per piece; the brief does not explicitly specify this. Case price = pieces per case x dealer price. Confirm and label before implementing.    |
| A02 | Tax inclusion and SKU tax rates are unspecified. Choose and document an internally consistent demo convention; do not invent statutory rates or claim tax compliance.       |
| A03 | Define whether loose-piece ordering is allowed. Initial proposal: case-only orders; detected piece requests require explicit resolution and are not silently rounded.       |
| A04 | Define the threshold basis for schemes. Initial proposal: biscuit free cases = floor(paid cases / 10), same SKU, with all paid and free cases consuming stock.              |
| A05 | Initial proposal: 3% detergent discount applies to the full eligible detergent line at five or more paid cases. Document rounding and whether schemes can stack.            |
| A06 | Initial proposal: no stacking, one seeded active scheme per SKU; do not accidentally multiply schemes.                                                                      |
| A07 | Define inventory timing and cancellations. Initial proposal: reserve/decrement once at successful order confirmation, reject insufficiency, release once on cancellation.   |
| A08 | Low/medium/high confidence is a documented heuristic/model assessment, not a calibrated probability. Evaluate against labelled examples.                                    |
| A09 | Establish safe alias learning: authorised desk correction, retailer scope, audit trail; resolve collisions rather than silently remapping existing aliases.                 |
| A10 | Exact Tally version, ledger mappings and import contract are absent. Select a documented export/mocked adapter boundary; a generic CSV alone is not proof of compatibility. |
| A11 | Demo identities, brands, extra SKUs, images and histories are fictional or appropriately licensed assets. No implied real client endorsement.                               |
| A12 | Define proposed order states and editing policy; preserve confirmed snapshots and log authorised changes.                                                                   |
| A13 | Authentication delivery can be mocked, but access control must be real. Select a clearly explained demo sign-in method.                                                     |

## 8. Development phases and exit gates

### Phase 0 — scope and planning (this document)

Capture requirements, deliverables, optional cuts, assumptions and acceptance criteria. Exit: one durable plan tied to the selected brief; do not mark implementation complete.

### Phase 1 — product design and technical foundation

- Finalise assumptions, screen journeys, bilingual content structure, state transitions and data model.
- Select stack, auth, hosting and actual AI provider; establish key setup without exposing secrets.
- Create Git repository, ignore rules, environment template and meaningful initial commits.
- Build schema/migrations and repeatable seed fixtures, preserving the provided three SKU values.
- Implement auth and role checks; lay out retailer and desk navigation.
- Define the Tally export contract early to prevent late surprises.

Exit: both roles can sign in to a seeded app; cross-retailer access is denied; architecture and assumptions are recorded.

### Phase 2 — complete manual ordering first

- Catalogue, retailer prices, pack units and stock display.
- Pure scheme engine, cart breakdown, server validation and atomic confirmation.
- Order detail and a minimal desk queue so the manual order journey is complete.
- Test threshold rules, rounding, free-goods stock, duplicate submissions and isolation.

Exit: a retailer can place a correct manual order and the desk can retrieve it from the database. No AI is needed to prove this foundation.

### Phase 3 — AI capture and human review

- Real structured extraction and catalogue-grounded matching using authorised retailer context.
- Review UI with source phrases, alternatives, confidence, explicit unit clarification and editing.
- Require acceptance before transferring resolved lines into the cart; confirmation still uses Phase 2's server logic.
- Implement scoped correction aliases and evaluate representative Hindi/English/Hinglish examples.
- Handle model failures, malformed output and timeouts without fabricating a successful result; manual ordering remains available.

Exit: supplied message produces a reviewable draft; unavailable tea is blocked; ambiguity is surfaced; no AI request places an order.

### Phase 4 — desk workflow and export

- Complete authorised desk state transitions, issue handling and audit history.
- Implement export selection, mapping, validation and actual download.
- Validate the agreed export contract and disclose any unverified external compatibility.
- Add repeat order/credit holds only if required scope is stable and time permits.

Exit: confirmed order proceeds through desk review to a usable, documented export artifact.

### Phase 5 — polish and verification

- Review mobile and desktop layouts, language switching, tap targets and keyboard accessibility.
- Finish loading, empty, validation, timeout, retry and permission-denied states.
- Optimise images, assets and loading; measure performance under documented conditions.
- Run targeted unit/integration/end-to-end checks and a clean-browser role walkthrough.
- Review secrets handling, input validation, model output validation, retailer isolation and demo data reset behaviour.

Exit: all required journeys work without dead controls; recorded tests and measurements support claims; limitations are explicit.

### Phase 6 — deployment, documentation and submission package

- Deploy if feasible, verify migrations/seeding and reviewer access on the actual deployed app.
- Verify clean local setup from the written instructions.
- Publish the authorised project repository publicly, retaining incremental history. Check for secrets before publishing.
- Finalise the TDD in PDF/Word and deployment.md from the implemented system, not this aspirational plan.
- Package exactly those two files, verify links, inspect the rendered TDD, check ZIP size and contents.
- User submits through the assignment portal unless separately requesting submission assistance; choosing a project does not itself authorise uploading a final application.

Exit: a verified submission ZIP and repository/live links are ready for the user.

## 9. Verification and demonstration fixtures

Required source SKUs:

| SKU        | Description                       | Dealer price Rs | Stock cases | Scheme                  |
| ---------- | --------------------------------- | --------------: | ----------: | ----------------------- |
| SKU-BS-075 | Glucose biscuit 75 g, case of 96  |            8.10 |         340 | Buy 10 cases get 1 free |
| SKU-DT-1KG | Detergent powder 1 kg, case of 20 |          101.50 |          85 | 3% off 5 or more cases  |
| SKU-TE-250 | Tea leaf 250 g, case of 40        |          118.00 |           0 | None                    |

Supplied text: `bhaiya 5 peti biscuit chhota, 2 peti washing powder 1 kilo, chai patti 250 wala 1 peti`

- Supplied text: matching and out-of-stock tea; neither biscuit nor detergent quantity reaches its scheme threshold.
- Scheme demo: ten biscuit cases and five detergent cases, displaying free goods and discount separately.
- Boundaries: biscuit 9/10/19/20 cases; detergent 4/5/6 cases; negative, fractional and excessively large quantities.
- Stock: ordered quantity plus free goods exceeds stock; competing confirmations; repeated submit or retry.
- AI: unknown SKU, ambiguous size, ambiguous units, missing quantity, mixed language, misleading instructions within text and unavailable provider.
- Access: retailer A attempts retailer B's prices, orders, alias context and exports; retailer attempts desk transitions.
- Corrections: one retailer's alias does not affect another; unsafe/conflicting alias rejected or reviewed.
- Export: escaping, invalid mappings, totals, historical snapshots and documented repeat-export behaviour.

Performance targets and business success numbers in the brief are not achieved outcomes. Do not claim measured reduction in order errors, staffing or costs from a demo.

## 10. Progress tracking

- [x] Brief reviewed; project selected by user; plan saved.
- [x] Phase 1: design and local foundation (AI-provider setup deliberately deferred to Phase 3; Tally compatibility remains unclaimed).
- [x] Phase 2: manual ordering, scheme logic, atomic stock checks and role isolation.
- [ ] Phase 3: AI capture.
- [x] Phase 4: desk and export. Local CSV handoff verified. Target-company Tally import remains unverified.
- [ ] Phase 5: quality verification.
- [ ] Phase 6: deployment and package.

Update this plan as decisions become final. Record material changes and rationale in the TDD; do not silently turn assumptions into claimed client requirements.
