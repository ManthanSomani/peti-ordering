import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Product } from "../shared/types";
import { priceCart } from "../shared/pricing";

export function openDatabase(path: string) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS retailers (id TEXT PRIMARY KEY, shop TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('retailer','desk')), retailer_id TEXT REFERENCES retailers(id),
      CHECK((role='retailer' AND retailer_id IS NOT NULL) OR (role='desk' AND retailer_id IS NULL)));
    CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS challenges (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), code_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, name_hi TEXT NOT NULL, brand TEXT NOT NULL, category TEXT NOT NULL,
      pack INTEGER NOT NULL CHECK(pack>0), size TEXT NOT NULL, stock INTEGER NOT NULL CHECK(stock>=0), scheme TEXT NOT NULL CHECK(scheme IN ('none','free10','discount3')), art TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS retailer_prices (retailer_id TEXT NOT NULL REFERENCES retailers(id), sku TEXT NOT NULL REFERENCES products(id), price_paise INTEGER NOT NULL CHECK(price_paise>=0), PRIMARY KEY(retailer_id,sku));
    CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, retailer_id TEXT NOT NULL REFERENCES retailers(id), created_at TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('confirmed','processing','packed','cancelled')), idempotency_key TEXT NOT NULL,
      request_hash TEXT NOT NULL, quote_json TEXT NOT NULL, UNIQUE(retailer_id,idempotency_key));
    CREATE TABLE IF NOT EXISTS order_events (id INTEGER PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), actor_id TEXT NOT NULL REFERENCES users(id), status TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS orders_retailer_date ON orders(retailer_id,created_at DESC);
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS retailer_aliases (
      retailer_id TEXT NOT NULL REFERENCES retailers(id),
      phrase TEXT NOT NULL,
      sku TEXT NOT NULL REFERENCES products(id),
      PRIMARY KEY(retailer_id, phrase)
    );
    INSERT OR IGNORE INTO schema_migrations VALUES(1,datetime('now'));
    INSERT OR IGNORE INTO schema_migrations VALUES(2,datetime('now'));
    CREATE TABLE IF NOT EXISTS message_inbox (
      id TEXT PRIMARY KEY,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL,
      dismissed INTEGER NOT NULL DEFAULT 0,
      order_id TEXT REFERENCES orders(id)
    );
    INSERT OR IGNORE INTO schema_migrations VALUES(3,datetime('now'));
  `);
  return db;
}

export const seedProducts: Product[] = [
  {
    id: "SKU-BS-075",
    name: "Glucose biscuits",
    nameHi: "ग्लूकोज़ बिस्कुट",
    brand: "Rozana",
    category: "food",
    pack: 96,
    size: "75 g",
    pricePaise: 810,
    stock: 340,
    scheme: "free10",
    art: "biscuit",
  },
  {
    id: "SKU-DT-1KG",
    name: "Detergent powder",
    nameHi: "डिटर्जेंट पाउडर",
    brand: "Ujala Home",
    category: "home",
    pack: 20,
    size: "1 kg",
    pricePaise: 10150,
    stock: 85,
    scheme: "discount3",
    art: "detergent",
  },
  {
    id: "SKU-TE-250",
    name: "Tea leaves",
    nameHi: "चाय पत्ती",
    brand: "Pahadi",
    category: "food",
    pack: 40,
    size: "250 g",
    pricePaise: 11800,
    stock: 0,
    scheme: "none",
    art: "tea",
  },
  {
    id: "DEMO-BS-150",
    name: "Glucose biscuits",
    nameHi: "ग्लूकोज़ बिस्कुट",
    brand: "Rozana",
    category: "food",
    pack: 48,
    size: "150 g",
    pricePaise: 1550,
    stock: 125,
    scheme: "none",
    art: "biscuit",
  },
  {
    id: "DEMO-DT-500",
    name: "Detergent powder",
    nameHi: "डिटर्जेंट पाउडर",
    brand: "Ujala Home",
    category: "home",
    pack: 40,
    size: "500 g",
    pricePaise: 5400,
    stock: 62,
    scheme: "none",
    art: "detergent",
  },
  {
    id: "DEMO-TE-100",
    name: "Everyday tea",
    nameHi: "रोज़ाना चाय",
    brand: "Pahadi",
    category: "food",
    pack: 60,
    size: "100 g",
    pricePaise: 4800,
    stock: 74,
    scheme: "none",
    art: "tea",
  },
  {
    id: "DEMO-SP-100",
    name: "Laundry soap",
    nameHi: "कपड़े धोने का साबुन",
    brand: "Ujala Home",
    category: "home",
    pack: 60,
    size: "100 g",
    pricePaise: 1800,
    stock: 106,
    scheme: "none",
    art: "soap",
  },
  {
    id: "DEMO-RC-1KG",
    name: "Everyday rice",
    nameHi: "रोज़ाना चावल",
    brand: "Gharana",
    category: "food",
    pack: 20,
    size: "1 kg",
    pricePaise: 6200,
    stock: 48,
    scheme: "none",
    art: "rice",
  },
];

export function seedDatabase(db: DatabaseSync) {
  if (db.prepare("SELECT id FROM users LIMIT 1").get()) return;
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("INSERT INTO retailers VALUES (?,?)").run("r1", "Sharma Kirana");
    db.prepare("INSERT INTO retailers VALUES (?,?)").run(
      "r2",
      "Verma General Store",
    );
    const user = db.prepare("INSERT INTO users VALUES(?,?,?,?,?)");
    user.run("u1", "Aarav Sharma", "sharma@peti.demo", "retailer", "r1");
    user.run("u2", "Meera Verma", "verma@peti.demo", "retailer", "r2");
    user.run("u3", "Order desk", "desk@peti.demo", "desk", null);
    const product = db.prepare(
      "INSERT INTO products VALUES(?,?,?,?,?,?,?,?,?,?)",
    );
    const price = db.prepare("INSERT INTO retailer_prices VALUES(?,?,?)");
    for (const p of seedProducts) {
      product.run(
        p.id,
        p.name,
        p.nameHi,
        p.brand,
        p.category,
        p.pack,
        p.size,
        p.stock,
        p.scheme,
        p.art,
      );
      price.run("r1", p.id, p.pricePaise);
      price.run("r2", p.id, p.pricePaise + 20);
    }
    // Existing demo orders: supplied inventory represents currently available stock.
    for (const [index, retailerId] of ["r1", "r2"].entries()) {
      const id = `PT-DEMO-00${index + 1}`;
      const quote = priceCart(
        [
          { sku: "SKU-BS-075", cases: 2 },
          { sku: "SKU-DT-1KG", cases: 1 },
        ],
        catalogue(db, retailerId),
      );
      const now = new Date(Date.now() - (index + 1) * 3600_000).toISOString();
      db.prepare("INSERT INTO orders VALUES(?,?,?,?,?,?,?)").run(
        id,
        retailerId,
        now,
        "confirmed",
        `seed-${index}`,
        "seed",
        JSON.stringify(quote),
      );
      db.prepare(
        "INSERT INTO order_events(order_id,actor_id,status,created_at) VALUES(?,?,?,?)",
      ).run(id, index === 0 ? "u1" : "u2", "confirmed", now);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function catalogue(db: DatabaseSync, retailerId: string): Product[] {
  return db
    .prepare(
      `SELECT p.id,p.name,p.name_hi AS nameHi,p.brand,p.category,p.pack,p.size,p.stock,p.scheme,p.art,r.price_paise AS pricePaise
    FROM products p JOIN retailer_prices r ON r.sku=p.id WHERE r.retailer_id=? ORDER BY p.rowid`,
    )
    .all(retailerId) as unknown as Product[];
}
