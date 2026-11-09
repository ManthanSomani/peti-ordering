import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { openDatabase, seedDatabase } from "../server/database";
import { createApp } from "../server/app";
let db: ReturnType<typeof openDatabase>;
let app: ReturnType<typeof createApp>;
const origin = "http://localhost:3000";
const headers = { "X-Peti-Request": "1", Origin: origin };
async function login(email = "sharma@peti.demo") {
  const agent = request.agent(app);
  const c = await agent
    .post("/api/auth/request")
    .set(headers)
    .send({ email })
    .expect(200);
  const verified = await agent
    .post("/api/auth/verify")
    .set(headers)
    .send({ challengeId: c.body.challengeId, code: c.body.demoCode })
    .expect(200);
  expect(verified.headers["set-cookie"][0]).toContain("HttpOnly");
  expect(verified.headers["set-cookie"][0]).toContain("SameSite=Lax");
  return agent;
}
beforeEach(() => {
  db = openDatabase(":memory:");
  seedDatabase(db);
  app = createApp(db, { demo: true, origin, secure: false });
});
afterEach(() => db.close());
it("confirms a simulated message once for its selected retailer", async () => {
  const desk = await login("desk@peti.demo");
  const retailer = await login();
  const id = randomUUID();
  const intake = { id, message: "5 peti biscuit chhota" };
  await retailer.get("/api/inbox").expect(403);
  await desk.post("/api/inbox").set(headers).send(intake).expect(201);
  await desk.post("/api/inbox").set(headers).send(intake).expect(200);
  const path = `/api/inbox/${id}`;
  const input = { retailerId: "r1", items: [{ sku: "SKU-BS-075", cases: 5 }] };
  const quote = await desk
    .post(`${path}/quote`)
    .set(headers)
    .send(input)
    .expect(200);
  expect((await retailer.get("/api/orders")).body.total).toBe(1);
  const confirmation = { ...input, expectedTotalPaise: quote.body.totalPaise };
  const order = await desk
    .post(`${path}/confirm`)
    .set(headers)
    .send(confirmation)
    .expect(201);
  await desk
    .post(`${path}/confirm`)
    .set(headers)
    .send(confirmation)
    .expect(409);
  await desk
    .post(`${path}/confirm`)
    .set(headers)
    .send({ ...confirmation, retailerId: "r2" })
    .expect(409);
  await retailer.get(`/api/orders/${order.body.id}`).expect(200);
  expect((await retailer.get("/api/orders")).body.total).toBe(2);
  expect((await desk.get("/api/inbox")).body.messages).toMatchObject([
    { id, orderId: order.body.id },
  ]);
});
it("grounds capture in the catalogue and keeps learned aliases retailer-scoped", async () => {
  const a = await login();
  const b = await login("verma@peti.demo");
  const desk = await login("desk@peti.demo");
  const body = { phrase: "biscuit chhota", sku: "SKU-BS-075" };
  await a
    .post("/api/orders/PT-DEMO-001/aliases")
    .set(headers)
    .send(body)
    .expect(403);
  await desk
    .post("/api/orders/PT-DEMO-001/aliases")
    .set(headers)
    .send(body)
    .expect(200);
  const message = "bhaiya 5 biscuit chhota";
  vi.stubEnv("OLLAMA_MODEL", "fixture");
  const provider = vi.fn(async () =>
    Response.json({
      message: {
        content: JSON.stringify({
          lines: [
            {
              index: 0,
              candidates: ["unknown-sku"],
              quantity: 5,
              unit: "unknown",
              confidence: "low",
            },
          ],
        }),
      },
    }),
  );
  vi.stubGlobal("fetch", provider);
  try {
    const first = await a
      .post("/api/capture")
      .set(headers)
      .send({ message })
      .expect(200);
    const second = await b
      .post("/api/capture")
      .set(headers)
      .send({ message })
      .expect(200);
    expect(
      first.body.lines[0].candidates.map((p: { id: string }) => p.id),
    ).toEqual(["SKU-BS-075"]);
    expect(first.body.lines[0].unit).toBe("unknown");
    expect(second.body.lines[0].candidates).toEqual([]);
    expect((await a.get("/api/orders")).body.total).toBe(1);
  } finally {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  }
});
describe("authentication and isolation", () => {
  it("requires authentication and rejects cross-origin writes", async () => {
    await request(app).get("/api/catalogue").expect(401);
    await request(app)
      .post("/api/auth/request")
      .send({ email: "sharma@peti.demo" })
      .expect(403);
    await request(app)
      .post("/api/auth/request")
      .set({ ...headers, Origin: "https://other.example" })
      .send({ email: "sharma@peti.demo" })
      .expect(403);
  });
  it("disables demo authentication when demo mode is off", async () => {
    const locked = createApp(db, { demo: false, origin, secure: false });
    await request(locked)
      .post("/api/auth/request")
      .set(headers)
      .send({ email: "sharma@peti.demo" })
      .expect(403);
  });
  it("uses retailer-specific prices and cannot accept another retailer ID", async () => {
    const a = await login();
    const b = await login("verma@peti.demo");
    const pa = await a.get("/api/catalogue?retailerId=r2").expect(200);
    const pb = await b.get("/api/catalogue").expect(200);
    expect(pa.body.items[0].pricePaise).toBe(810);
    expect(pb.body.items[0].pricePaise).toBe(830);
    await a.get("/api/orders/PT-DEMO-002").expect(404);
    const orders = await a.get("/api/orders").expect(200);
    expect(
      orders.body.items.every(
        (o: { retailerId: string }) => o.retailerId === "r1",
      ),
    ).toBe(true);
    await a
      .patch("/api/orders/PT-DEMO-001/status")
      .set(headers)
      .send({ status: "processing" })
      .expect(403);
  });
  it("invalidates sessions at logout", async () => {
    const a = await login();
    await a.post("/api/auth/logout").set(headers).expect(200);
    await a.get("/api/me").expect(401);
  });
  it("expires codes, limits attempts and prevents code reuse", async () => {
    const a = request.agent(app);
    const c = await a
      .post("/api/auth/request")
      .set(headers)
      .send({ email: "sharma@peti.demo" });
    const wrong = c.body.demoCode === "111111" ? "222222" : "111111";
    for (let i = 0; i < 5; i++)
      await a
        .post("/api/auth/verify")
        .set(headers)
        .send({ challengeId: c.body.challengeId, code: wrong })
        .expect(400);
    await a
      .post("/api/auth/verify")
      .set(headers)
      .send({ challengeId: c.body.challengeId, code: c.body.demoCode })
      .expect(400);
    const expired = await a
      .post("/api/auth/request")
      .set(headers)
      .send({ email: "sharma@peti.demo" });
    db.prepare("UPDATE challenges SET expires_at=0").run();
    await a
      .post("/api/auth/verify")
      .set(headers)
      .send({
        challengeId: expired.body.challengeId,
        code: expired.body.demoCode,
      })
      .expect(400);
    const fresh = await a
      .post("/api/auth/request")
      .set(headers)
      .send({ email: "sharma@peti.demo" });
    const body = {
      challengeId: fresh.body.challengeId,
      code: fresh.body.demoCode,
    };
    await a.post("/api/auth/verify").set(headers).send(body).expect(200);
    await a.post("/api/auth/verify").set(headers).send(body).expect(400);
  });
});
describe("transactional ordering", () => {
  it("applies schemes, snapshots prices and prevents duplicate submission", async () => {
    const a = await login();
    const items = [
      { sku: "SKU-BS-075", cases: 10 },
      { sku: "SKU-DT-1KG", cases: 5 },
    ];
    const q = await a
      .post("/api/cart/quote")
      .set(headers)
      .send({ items })
      .expect(200);
    expect(q.body.freeCases).toBe(1);
    expect(q.body.discountPaise).toBe(30450);
    const body = {
      items,
      expectedTotalPaise: q.body.totalPaise,
      idempotencyKey: randomUUID(),
    };
    const created = await a
      .post("/api/orders")
      .set(headers)
      .send(body)
      .expect(201);
    const again = await a
      .post("/api/orders")
      .set(headers)
      .send(body)
      .expect(200);
    expect(again.body.id).toBe(created.body.id);
    expect(
      db.prepare("SELECT stock FROM products WHERE id=?").get("SKU-BS-075")
        ?.stock,
    ).toBe(329);
    await a
      .post("/api/orders")
      .set(headers)
      .send({ ...body, items: [{ sku: "SKU-BS-075", cases: 11 }] })
      .expect(409);
    db.prepare("UPDATE retailer_prices SET price_paise=1").run();
    const historic = await a.get(`/api/orders/${created.body.id}`).expect(200);
    expect(historic.body.totalPaise).toBe(q.body.totalPaise);
  });
  it("rejects tampered totals and unsupported fields without touching stock", async () => {
    const a = await login();
    const body = {
      items: [{ sku: "SKU-BS-075", cases: 10 }],
      expectedTotalPaise: 1,
      idempotencyKey: randomUUID(),
    };
    await a.post("/api/orders").set(headers).send(body).expect(409);
    await a
      .post("/api/orders")
      .set(headers)
      .send({ ...body, retailerId: "r2" })
      .expect(400);
    expect(
      db.prepare("SELECT stock FROM products WHERE id=?").get("SKU-BS-075")
        ?.stock,
    ).toBe(340);
  });
  it("rejects the second order when both would consume the same remaining stock", async () => {
    db.prepare("UPDATE products SET stock=11 WHERE id=?").run("SKU-BS-075");
    const a = await login();
    const items = [{ sku: "SKU-BS-075", cases: 10 }];
    const q = await a.post("/api/cart/quote").set(headers).send({ items });
    const make = () =>
      a.post("/api/orders").set(headers).send({
        items,
        expectedTotalPaise: q.body.totalPaise,
        idempotencyKey: randomUUID(),
      });
    const results = await Promise.all([make(), make()]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(
      db.prepare("SELECT stock FROM products WHERE id=?").get("SKU-BS-075")
        ?.stock,
    ).toBe(0);
  });
  it("enforces desk transitions and restores cancelled stock only once", async () => {
    const a = await login();
    const desk = await login("desk@peti.demo");
    const items = [{ sku: "SKU-BS-075", cases: 10 }];
    const q = await a.post("/api/cart/quote").set(headers).send({ items });
    const o = await a.post("/api/orders").set(headers).send({
      items,
      expectedTotalPaise: q.body.totalPaise,
      idempotencyKey: randomUUID(),
    });
    await desk
      .patch(`/api/orders/${o.body.id}/status`)
      .set(headers)
      .send({ status: "packed" })
      .expect(409);
    await desk
      .patch(`/api/orders/${o.body.id}/status`)
      .set(headers)
      .send({ status: "cancelled" })
      .expect(200);
    await desk
      .patch(`/api/orders/${o.body.id}/status`)
      .set(headers)
      .send({ status: "cancelled" })
      .expect(409);
    expect(
      db.prepare("SELECT stock FROM products WHERE id=?").get("SKU-BS-075")
        ?.stock,
    ).toBe(340);
  });
});
