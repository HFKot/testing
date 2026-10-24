import express from "express";
import { existsSync } from "node:fs";
import path from "node:path";
import { DatasetStore, projectRoot } from "./store.mjs";
import { synchronize as refresh } from "./roster.mjs";
import { exportCsv } from "./csv.mjs";

function mutationGuard(allowedOrigins) {
  const trusted = new Set(
    allowedOrigins.filter(Boolean).map((value) => {
      const url = new URL(value);
      if (!["http:", "https:"].includes(url.protocol) || url.origin !== value)
        throw new Error(
          "ALLOWED_ORIGINS must contain complete origins without paths or trailing slashes.",
        );
      return value;
    }),
  );
  return (req, res, next) => {
    if (req.get("sec-fetch-site") === "cross-site")
      return res
        .status(403)
        .json({ error: "Cross-site updates are not allowed." });
    let host;
    try {
      host = new URL(`http://${req.get("host")}`);
    } catch {
      return res.status(403).json({ error: "Invalid request host." });
    }
    const local =
      ["localhost", "127.0.0.1", "[::1]"].includes(host.hostname) &&
      !host.username &&
      !host.password;
    const configured = [...trusted].some(
      (origin) => new URL(origin).host === host.host,
    );
    if (!local && !configured)
      return res
        .status(403)
        .json({
          error:
            "Configure ALLOWED_ORIGINS with this application origin before refreshing.",
        });
    const origin = req.get("origin");
    if (origin) {
      let parsed;
      try {
        parsed = new URL(origin);
      } catch {
        return res.status(403).json({ error: "Invalid request origin." });
      }
      // Vite's proxy preserves the browser Host and forwards the request to this API.
      if (
        !["http:", "https:"].includes(parsed.protocol) ||
        parsed.origin !== origin ||
        parsed.host !== host.host ||
        (!local && !trusted.has(origin))
      )
        return res
          .status(403)
          .json({ error: "Cross-origin updates are not allowed." });
    }
    next();
  };
}

export function createApp({
  store = new DatasetStore(),
  synchronize = refresh,
  distDir = path.join(projectRoot, "dist"),
  allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim()),
} = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    res.set("X-Content-Type-Options", "nosniff");
    next();
  });
  app.get("/api/health", async (_req, res) => {
    const dataset = await store.read();
    res.json({
      ok: true,
      people: dataset.people.length,
      evidence: dataset.evidence.length,
      lastUpdated: dataset.lastUpdated,
    });
  });
  app.get("/api/data", async (_req, res) => res.json(await store.read()));
  app.get("/api/export.csv", async (req, res) => {
    const ids = new URL(req.originalUrl, "http://local").searchParams.getAll(
      "id",
    );
    if (ids.length > 1000 || ids.some((id) => id.length > 200))
      return res.status(400).json({ error: "Invalid export person IDs." });
    res.set("Content-Type", "text/csv; charset=utf-8");
    res.set("Content-Disposition", 'attachment; filename="voto-claro.csv"');
    res.send(exportCsv(await store.read(), ids));
  });
  app.post("/api/sync", mutationGuard(allowedOrigins), async (_req, res) => {
    const dataset = await synchronize(store);
    res.status(dataset.sync?.ok === false ? 502 : 200).json(dataset);
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "API route not found." }),
  );
  if (existsSync(path.join(distDir, "index.html"))) {
    app.use(express.static(distDir));
    app.get("/{*path}", (req, res, next) =>
      req.accepts("html")
        ? res.sendFile(path.join(distDir, "index.html"))
        : next(),
    );
  }
  app.use((_req, res) => res.status(404).json({ error: "Route not found." }));
  app.use((error, _req, res, _next) => {
    const status =
      Number.isInteger(error.status) &&
      error.status >= 400 &&
      error.status < 600
        ? error.status
        : 500;
    console.error("API request failed:", error.name || "Error");
    res
      .status(status)
      .json({
        error:
          status === 409
            ? error.message
            : "No se pudo completar la solicitud. La copia guardada se conserva.",
      });
  });
  return app;
}
