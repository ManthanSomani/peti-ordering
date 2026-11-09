import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { parseCookie as parse, stringifySetCookie } from "cookie";
import {
  createHash,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { catalogue } from "./database";
import { orderExport } from "./order-export";
import { captureOrder, normalizeAlias } from "./capture";
import { DomainError, priceCart } from "../shared/pricing";
import type { User, Order, Quote, Status, CartItem } from "../shared/types";

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const cartSchema = z
  .array(
    z
      .object({
        sku: z.string().min(1).max(80),
        cases: z.number().int().min(1).max(1000),
      })
      .strict(),
  )
  .min(1)
  .max(50);
type Config = {
  demo: boolean;
  origin: string;
  secure: boolean;
  production?: boolean;
};

export function createApp(db: DatabaseSync, config: Config) {
  const app = express();
  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: config.production
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'"],
              imgSrc: ["'self'", "data:"],
              connectSrc: ["'self'"],
              fontSrc: ["'self'"],
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
              upgradeInsecureRequests: config.secure ? [] : null,
            },
          }
        : false,
      strictTransportSecurity: config.secure ? undefined : false,
    }),
  );
  app.use(express.json({ limit: "32kb" }));
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.use("/api", (req, res, next) => {
    if (["POST", "PATCH", "DELETE", "PUT"].includes(req.method)) {
      if (
        req.get("X-Peti-Request") !== "1" ||
        (req.get("Origin") && req.get("Origin") !== config.origin) ||
        req.get("Sec-Fetch-Site") === "cross-site"
      ) {
        res.status(403).json({
          error: "Open Peti directly to make changes.",
          code: "CROSS_SITE",
        });
        return;
      }
    }
    next();
  });
  const authLimit = rateLimit({
    windowMs: 60_000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: "Too many attempts. Try again in one minute.",
      code: "RATE_LIMIT",
    },
  });
  app.use("/api/auth", authLimit);
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/config", (_req, res) => res.json({ demo: config.demo }));

  app.post("/api/auth/request", (req, res) => {
    if (!config.demo)
      throw new DomainError("DEMO_DISABLED", "Demo sign-in is disabled.", 403);
    const { email } = z
      .object({ email: z.string().email().max(120) })
      .parse(req.body);
    const u = db
      .prepare("SELECT id FROM users WHERE email=?")
      .get(email.toLowerCase()) as { id: string } | undefined;
    if (!u)
      throw new DomainError(
        "UNKNOWN_ACCOUNT",
        "Choose one of the listed demo accounts.",
        400,
      );
    const challengeId = randomUUID();
    const code = String(randomInt(100000, 1000000));
    db.prepare("DELETE FROM challenges WHERE user_id=? OR expires_at<?").run(
      u.id,
      Date.now(),
    );
    db.prepare(
      "INSERT INTO challenges(id,user_id,code_hash,expires_at) VALUES(?,?,?,?)",
    ).run(
      challengeId,
      u.id,
      hash(`${challengeId}:${code}`),
      Date.now() + 300_000,
    );
    res.json({ challengeId, demoCode: code, expiresIn: 300 });
  });

  app.post("/api/auth/verify", (req, res) => {
    if (!config.demo)
      throw new DomainError("DEMO_DISABLED", "Demo sign-in is disabled.", 403);
    const { challengeId, code } = z
      .object({
        challengeId: z.string().uuid(),
        code: z.string().regex(/^\d{6}$/),
      })
      .parse(req.body);
    const c = db
      .prepare("SELECT * FROM challenges WHERE id=?")
      .get(challengeId) as
      | {
          user_id: string;
          code_hash: string;
          expires_at: number;
          attempts: number;
        }
      | undefined;
    if (!c || c.expires_at < Date.now() || c.attempts >= 5)
      throw new DomainError(
        "CODE_EXPIRED",
        "Request a new code and try again.",
        400,
      );
    db.prepare("UPDATE challenges SET attempts=attempts+1 WHERE id=?").run(
      challengeId,
    );
    if (
      !timingSafeEqual(
        Buffer.from(c.code_hash),
        Buffer.from(hash(`${challengeId}:${code}`)),
      )
    )
      throw new DomainError(
        "CODE_INVALID",
        "That code did not match. Check the six digits.",
        400,
      );
    db.prepare("DELETE FROM challenges WHERE id=?").run(challengeId);
    db.prepare("DELETE FROM sessions WHERE expires_at<?").run(Date.now());
    const token = randomBytes(32).toString("hex");
    db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
      hash(token),
      c.user_id,
      Date.now() + 8 * 3600_000,
    );
    res.setHeader(
      "Set-Cookie",
      stringifySetCookie({
        name: "peti_session",
        value: token,
        httpOnly: true,
        sameSite: "lax",
        secure: config.secure,
        path: "/",
        maxAge: 8 * 3600,
      }),
    );
    res.json({ ok: true });
  });

  app.post("/api/auth/logout", (req, res) => {
    const token = parse(req.headers.cookie ?? "").peti_session;
    if (token) db.prepare("DELETE FROM sessions WHERE hash=?").run(hash(token));
    res.setHeader(
      "Set-Cookie",
      stringifySetCookie({
        name: "peti_session",
        value: "",
        httpOnly: true,
        sameSite: "lax",
        secure: config.secure,
        path: "/",
        maxAge: 0,
      }),
    );
    res.json({ ok: true });
  });

  app.use("/api", (req, res, next) => {
    const token = parse(req.headers.cookie ?? "").peti_session;
    const user =
      token &&
      (db
        .prepare(
          `SELECT u.id,u.name,u.email,u.role,u.retailer_id AS retailerId,r.shop FROM sessions s JOIN users u ON s.user_id=u.id
      LEFT JOIN retailers r ON r.id=u.retailer_id WHERE s.hash=? AND s.expires_at>?`,
        )
        .get(hash(token), Date.now()) as unknown as User | undefined);
    if (!user) {
      res.status(401).json({
        error: "Your session has ended. Sign in again.",
        code: "UNAUTHENTICATED",
      });
      return;
    }
    res.locals.user = user;
    next();
  });
  const retailer = (_req: Request, res: Response, next: NextFunction) => {
    if ((res.locals.user as User).role !== "retailer")
      throw new DomainError("FORBIDDEN", "This action is for retailers.", 403);
    next();
  };
  const desk = (_req: Request, res: Response, next: NextFunction) => {
    if ((res.locals.user as User).role !== "desk")
      throw new DomainError(
        "FORBIDDEN",
        "Only the order desk can do this.",
        403,
      );
    next();
  };
  app.get("/api/me", (_req, res) => res.json(res.locals.user));
  app.get("/api/catalogue", retailer, (req, res) => {
    const { q, category, page } = z
      .object({
        q: z.string().max(100).default(""),
        category: z.enum(["all", "food", "home", "offers"]).default("all"),
        page: z.coerce.number().int().min(1).max(10000).default(1),
      })
      .parse(req.query);
    let items = catalogue(db, res.locals.user.retailerId);
    const needle = q.toLocaleLowerCase();
    items = items.filter(
      (p) =>
        `${p.name} ${p.nameHi} ${p.brand} ${p.id} ${p.size}`
          .toLocaleLowerCase()
          .includes(needle) &&
        (category === "all" ||
          (category === "offers"
            ? p.scheme !== "none"
            : p.category === category)),
    );
    const pages = Math.max(1, Math.ceil(items.length / 12));
    const safePage = Math.min(page, pages);
    res.json({
      items: items.slice((safePage - 1) * 12, safePage * 12),
      total: items.length,
      page: safePage,
      pages,
    });
  });
  const messageSchema = z
    .object({ message: z.string().trim().min(1).max(3000) })
    .strict();
  function captureForRetailer(message: string, retailerId: string) {
    const products = catalogue(db, retailerId);
    const history = db
      .prepare(
        "SELECT quote_json FROM orders WHERE retailer_id=? AND status!='cancelled' ORDER BY created_at DESC LIMIT 20",
      )
      .all(retailerId);
    const recentSkus = [
      ...new Set(
        history.flatMap((row) =>
          (
            JSON.parse(String(row.quote_json)) as { lines: { sku: string }[] }
          ).lines.map((line) => line.sku),
        ),
      ),
    ].filter((sku) => products.some((product) => product.id === sku));
    const aliases = db
      .prepare("SELECT phrase, sku FROM retailer_aliases WHERE retailer_id=?")
      .all(retailerId) as { phrase: string; sku: string }[];
    return captureOrder(message, products, { recentSkus, aliases });
  }
  app.post("/api/capture", retailer, async (req, res) => {
    const { message } = messageSchema.parse(req.body);
    res.json(await captureForRetailer(message, res.locals.user.retailerId));
  });

  function pendingMessage(id: string) {
    const row = db
      .prepare(
        "SELECT message, dismissed, order_id FROM message_inbox WHERE id=?",
      )
      .get(id);
    if (!row) throw new DomainError("NOT_FOUND", "Message not found.", 404);
    if (row.dismissed || row.order_id)
      throw new DomainError(
        "MESSAGE_RESOLVED",
        "This message has already been handled.",
        409,
      );
    return String(row.message);
  }
  const retailerIdSchema = z.string().min(1).max(80);
  function requireRetailer(id: string) {
    if (!db.prepare("SELECT id FROM retailers WHERE id=?").get(id))
      throw new DomainError("NOT_FOUND", "Retailer not found.", 404);
  }
  app.get("/api/inbox", desk, (_req, res) => {
    res.json({
      messages: db
        .prepare(
          "SELECT id, message, created_at AS createdAt, order_id AS orderId, dismissed FROM message_inbox ORDER BY created_at DESC LIMIT 50",
        )
        .all(),
      retailers: db
        .prepare("SELECT id, shop FROM retailers ORDER BY shop")
        .all(),
      simulation: config.demo,
    });
  });
  app.post("/api/inbox", desk, (req, res) => {
    if (!config.demo)
      throw new DomainError(
        "FORBIDDEN",
        "Simulation is available in demo mode only.",
        403,
      );
    const { message, id } = messageSchema
      .extend({ id: z.string().uuid() })
      .parse(req.body);
    const prior = db
      .prepare("SELECT message FROM message_inbox WHERE id=?")
      .get(id);
    if (prior && prior.message !== message)
      throw new DomainError(
        "IDEMPOTENCY_CONFLICT",
        "This message ID is already in use.",
        409,
      );
    if (!prior)
      db.prepare(
        "INSERT INTO message_inbox(id,message,created_at) VALUES(?,?,?)",
      ).run(id, message, new Date().toISOString());
    res.status(prior ? 200 : 201).json({ id });
  });
  app.post("/api/inbox/:id/draft", desk, async (req, res) => {
    const { retailerId } = z
      .object({ retailerId: retailerIdSchema })
      .strict()
      .parse(req.body);
    requireRetailer(retailerId);
    res.json(
      await captureForRetailer(
        pendingMessage(String(req.params.id)),
        retailerId,
      ),
    );
  });
  app.post("/api/inbox/:id/quote", desk, (req, res) => {
    const { retailerId, items } = z
      .object({ retailerId: retailerIdSchema, items: cartSchema })
      .strict()
      .parse(req.body);
    pendingMessage(String(req.params.id));
    requireRetailer(retailerId);
    res.json(priceCart(items, catalogue(db, retailerId)));
  });
  app.post("/api/inbox/:id/dismiss", desk, (req, res) => {
    const id = String(req.params.id);
    pendingMessage(id);
    db.prepare("UPDATE message_inbox SET dismissed=1 WHERE id=?").run(id);
    res.json({ dismissed: true });
  });

  app.post("/api/orders/:id/aliases", desk, (req, res) => {
    const { phrase, sku } = z
      .object({
        phrase: z.string().trim().min(2).max(100),
        sku: z.string().min(1).max(100),
      })
      .strict()
      .parse(req.body);
    const order = db
      .prepare("SELECT retailer_id, quote_json FROM orders WHERE id=?")
      .get(String(req.params.id));
    if (!order)
      throw new DomainError("ORDER_NOT_FOUND", "Order not found.", 404);
    const key = normalizeAlias(phrase);
    const quote = JSON.parse(String(order.quote_json)) as {
      lines: { sku: string }[];
    };
    if (!/\p{L}/u.test(key) || !quote.lines.some((line) => line.sku === sku))
      throw new DomainError(
        "INVALID_ALIAS",
        "Use a product phrase and a SKU from this order.",
        400,
      );
    db.prepare(
      "INSERT INTO retailer_aliases(retailer_id,phrase,sku) VALUES(?,?,?) ON CONFLICT(retailer_id,phrase) DO UPDATE SET sku=excluded.sku",
    ).run(order.retailer_id, key, sku);
    res.json({ saved: true });
  });

  app.post("/api/cart/quote", retailer, (req, res) => {
    const { items } = z.object({ items: cartSchema }).strict().parse(req.body);
    res.json(priceCart(items, catalogue(db, res.locals.user.retailerId)));
  });

  const orderSchema = z
    .object({
      items: cartSchema,
      idempotencyKey: z.string().uuid(),
      expectedTotalPaise: z.number().int().nonnegative(),
    })
    .strict();
  app.post("/api/orders", retailer, (req, res) => {
    const { items, idempotencyKey, expectedTotalPaise } = orderSchema.parse(
      req.body,
    );
    const user = res.locals.user as User;
    saveOrder(
      res,
      user.id,
      user.retailerId!,
      items,
      idempotencyKey,
      expectedTotalPaise,
    );
  });
  app.post("/api/inbox/:id/confirm", desk, (req, res) => {
    const { retailerId, items, expectedTotalPaise } = orderSchema
      .omit({ idempotencyKey: true })
      .extend({ retailerId: retailerIdSchema })
      .parse(req.body);
    const messageId = z.string().uuid().parse(req.params.id);
    requireRetailer(retailerId);
    saveOrder(
      res,
      res.locals.user.id,
      retailerId,
      items,
      messageId,
      expectedTotalPaise,
      messageId,
    );
  });
  function saveOrder(
    res: Response,
    actorId: string,
    retailerId: string,
    items: CartItem[],
    idempotencyKey: string,
    expectedTotalPaise: number,
    messageId?: string,
  ) {
    const requestHash = hash(
      JSON.stringify({
        items: [...items].sort((a, b) => a.sku.localeCompare(b.sku)),
        expectedTotalPaise,
      }),
    );
    db.exec("BEGIN IMMEDIATE");
    try {
      if (messageId) pendingMessage(messageId);
      const existing = db
        .prepare(
          "SELECT id,request_hash FROM orders WHERE retailer_id=? AND idempotency_key=?",
        )
        .get(retailerId, idempotencyKey) as
        { id: string; request_hash: string } | undefined;
      if (existing) {
        if (messageId)
          throw new DomainError(
            "IDEMPOTENCY_CONFLICT",
            "The order reference is already in use.",
            409,
          );
        if (existing.request_hash !== requestHash)
          throw new DomainError(
            "IDEMPOTENCY_CONFLICT",
            "This submission was already used for a different order.",
            409,
          );
        db.exec("COMMIT");
        res.json({ id: existing.id });
        return;
      }
      const quote = priceCart(items, catalogue(db, retailerId));
      if (quote.totalPaise !== expectedTotalPaise)
        throw new DomainError(
          "PRICE_CHANGED",
          "Prices changed. Review the updated total before confirming.",
          409,
        );
      const id = `PT-${randomBytes(5).toString("hex").toUpperCase()}`;
      const now = new Date().toISOString();
      for (const line of quote.lines)
        db.prepare("UPDATE products SET stock=stock-? WHERE id=?").run(
          line.cases + line.freeCases,
          line.sku,
        );
      db.prepare("INSERT INTO orders VALUES(?,?,?,?,?,?,?)").run(
        id,
        retailerId,
        now,
        "confirmed",
        idempotencyKey,
        requestHash,
        JSON.stringify(quote),
      );
      db.prepare(
        "INSERT INTO order_events(order_id,actor_id,status,created_at) VALUES(?,?,?,?)",
      ).run(id, actorId, "confirmed", now);
      if (messageId)
        db.prepare("UPDATE message_inbox SET order_id=? WHERE id=?").run(
          id,
          messageId,
        );
      db.exec("COMMIT");
      res.status(201).json({ id });
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK");
      throw error;
    }
  }

  const toOrder = (row: Record<string, unknown>): Order => ({
    ...(JSON.parse(row.quote_json as string) as Quote),
    id: row.id as string,
    retailerId: row.retailer_id as string,
    shop: row.shop as string,
    createdAt: row.created_at as string,
    status: row.status as Status,
  });
  app.get("/api/orders", (req, res) => {
    const { page, status } = z
      .object({
        page: z.coerce.number().int().min(1).max(10000).default(1),
        status: z
          .enum(["all", "confirmed", "processing", "packed", "cancelled"])
          .default("all"),
      })
      .parse(req.query);
    const u = res.locals.user as User;
    const conditions: string[] = [];
    const params: string[] = [];
    if (u.role === "retailer") {
      conditions.push("o.retailer_id=?");
      params.push(u.retailerId!);
    }
    if (status !== "all") {
      conditions.push("o.status=?");
      params.push(status);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const count = db
      .prepare(`SELECT COUNT(*) as total FROM orders o ${where}`)
      .get(...params) as { total: number };
    const pages = Math.max(1, Math.ceil(count.total / 12));
    const safePage = Math.min(page, pages);
    const rows = db
      .prepare(
        `SELECT o.*,r.shop FROM orders o JOIN retailers r ON r.id=o.retailer_id ${where} ORDER BY o.created_at DESC,o.id DESC LIMIT 12 OFFSET ?`,
      )
      .all(...params, (safePage - 1) * 12);
    res.json({
      items: rows.map(toOrder),
      total: count.total,
      page: safePage,
      pages,
    });
  });
  app.get("/api/orders/:id", (req, res) => {
    const u = res.locals.user as User;
    const row = db
      .prepare(
        `SELECT o.*,r.shop FROM orders o JOIN retailers r ON r.id=o.retailer_id WHERE o.id=? AND (?='desk' OR o.retailer_id=?)`,
      )
      .get(String(req.params.id), u.role, u.retailerId) as
      Record<string, unknown> | undefined;
    if (!row) throw new DomainError("NOT_FOUND", "Order not found.", 404);
    res.json({
      ...toOrder(row),
      events: db
        .prepare(
          "SELECT status,created_at AS createdAt FROM order_events WHERE order_id=? ORDER BY id",
        )
        .all(String(req.params.id)),
    });
  });
  app.get("/api/orders/:id/export", desk, (req, res) => {
    const row = db
      .prepare(
        "SELECT o.*, r.shop FROM orders o JOIN retailers r ON r.id=o.retailer_id WHERE o.id=?",
      )
      .get(String(req.params.id));
    if (!row) throw new DomainError("NOT_FOUND", "Order not found.", 404);
    const order = toOrder(row);
    const csv = orderExport(order);
    res
      .attachment(`peti-${order.id}-tally-staging.csv`)
      .type("text/csv")
      .send(csv);
  });

  app.patch("/api/orders/:id/status", desk, (req, res) => {
    const { status } = z
      .object({ status: z.enum(["processing", "packed", "cancelled"]) })
      .strict()
      .parse(req.body);
    db.exec("BEGIN IMMEDIATE");
    try {
      const row = db
        .prepare("SELECT status,quote_json FROM orders WHERE id=?")
        .get(String(req.params.id)) as
        { status: Status; quote_json: string } | undefined;
      if (!row) throw new DomainError("NOT_FOUND", "Order not found.", 404);
      const allowed: Record<Status, string[]> = {
        confirmed: ["processing", "cancelled"],
        processing: ["packed"],
        packed: [],
        cancelled: [],
      };
      if (!allowed[row.status].includes(status))
        throw new DomainError(
          "INVALID_TRANSITION",
          "Order status changed. Refresh before trying again.",
          409,
        );
      if (status === "cancelled")
        for (const line of (JSON.parse(row.quote_json) as Quote).lines)
          db.prepare("UPDATE products SET stock=stock+? WHERE id=?").run(
            line.cases + line.freeCases,
            line.sku,
          );
      db.prepare("UPDATE orders SET status=? WHERE id=?").run(
        status,
        String(req.params.id),
      );
      db.prepare(
        "INSERT INTO order_events(order_id,actor_id,status,created_at) VALUES(?,?,?,?)",
      ).run(
        String(req.params.id),
        res.locals.user.id,
        status,
        new Date().toISOString(),
      );
      db.exec("COMMIT");
      res.json({ ok: true });
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK");
      throw error;
    }
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "API route not found.", code: "NOT_FOUND" }),
  );
  app.use(
    (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: "Check the entered values and try again.",
          code: "VALIDATION",
        });
        return;
      }
      if (error instanceof DomainError) {
        res
          .status(error.status)
          .json({ error: error.message, code: error.code });
        return;
      }
      if (error instanceof SyntaxError) {
        res
          .status(400)
          .json({ error: "Invalid request data.", code: "INVALID_JSON" });
        return;
      }
      console.error(
        "Unhandled server error:",
        error instanceof Error ? error.message : "unknown",
      );
      res.status(500).json({
        error: "Something went wrong. Your request could not be completed.",
        code: "SERVER_ERROR",
      });
    },
  );
  return app;
}
