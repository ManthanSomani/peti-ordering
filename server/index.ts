import "dotenv/config";
import { resolve } from "node:path";
import express from "express";
import { openDatabase, seedDatabase } from "./database";
import { createApp } from "./app";

const production = process.argv.includes("--production");
const port = Number(process.env.PORT ?? 3000);
const demo = process.env.DEMO_MODE === "true";
const db = openDatabase(process.env.DATABASE_PATH ?? "./data/peti.sqlite");
if (demo) seedDatabase(db);
const app = createApp(db, {
  demo,
  origin: process.env.APP_ORIGIN ?? `http://localhost:${port}`,
  secure: process.env.COOKIE_SECURE === "true",
  production,
});
if (production) {
  app.use(express.static(resolve("dist"), { index: false }));
  app.get("/{*path}", (_req, res) => res.sendFile(resolve("dist/index.html")));
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
const server = app.listen(port, process.env.HOST ?? "127.0.0.1", () =>
  console.log(
    `Peti running at http://localhost:${port} (${demo ? "synthetic demo data" : "demo sign-in disabled"})`,
  ),
);
process.on("SIGTERM", () =>
  server.close(() => {
    db.close();
    process.exit(0);
  }),
);
