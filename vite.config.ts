import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import type { IncomingMessage, ServerResponse } from "http";

// Shim Node builtins that ssb-motor imports (fs, path, crypto)
// so it can run in the browser (cache operations become no-ops)
function nodeShims(): Plugin {
  const shimIds = [
    "fs",
    "fs/promises",
    "node:fs",
    "node:fs/promises",
    "path",
    "node:path",
    "node:crypto",
    "crypto",
  ];

  return {
    name: "node-shims",
    enforce: "pre" as const,
    resolveId(id) {
      if (shimIds.includes(id)) return `\0shim:${id}`;
    },
    load(id) {
      if (!id.startsWith("\0shim:")) return;

      if (id.includes("fs")) {
        return `
          const noop = () => {};
          const fail = () => { throw new Error('fs not available'); };
          export const readFile = fail;
          export const writeFile = noop;
          export const mkdir = noop;
          export const readdir = async () => [];
          export const stat = fail;
          export const unlink = noop;
          export const rm = noop;
          export const access = fail;
          export const existsSync = () => false;
          export const mkdirSync = noop;
          export const readFileSync = fail;
          export const writeFileSync = noop;
          export const promises = { readFile, writeFile, mkdir, readdir, stat, unlink, rm, access };
          export default { readFile, writeFile, mkdir, readdir, stat, unlink, rm, access, existsSync, mkdirSync, readFileSync, writeFileSync, promises };
        `;
      }
      if (id.includes("path")) {
        return `
          export const join = (...a) => a.join('/');
          export const resolve = (...a) => a.join('/');
          export const dirname = (p) => p.split('/').slice(0, -1).join('/');
          export const basename = (p) => p.split('/').pop();
          export const extname = (p) => { const m = p.match(/\\.[^.]+$/); return m ? m[0] : ''; };
          export const sep = '/';
          export default { join, resolve, dirname, basename, extname, sep };
        `;
      }
      if (id.includes("crypto")) {
        return `
          export function createHash() {
            let data = '';
            return {
              update(d) { data += d; return this; },
              digest() {
                // Simple hash for cache keys – doesn't need to be cryptographic
                let h = 0;
                for (let i = 0; i < data.length; i++) {
                  h = ((h << 5) - h + data.charCodeAt(i)) | 0;
                }
                return Math.abs(h).toString(16).padStart(16, '0');
              }
            };
          }
          export default { createHash };
        `;
      }
    },
  };
}

// Mirrors the logic in api/market.ts (Vercel Edge Function) but runs inside
// the Vite dev server so local development doesn't need `vercel dev`.
function marketProxy(): Plugin {
  const UA =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

  let crumb: string | null = null;
  let cookie: string | null = null;
  let crumbExpiry = 0;

  async function refreshSession() {
    const res = await fetch(
      "https://query2.finance.yahoo.com/v1/test/getcrumb",
      {
        headers: {
          "User-Agent": UA,
          Accept: "*/*",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: "https://finance.yahoo.com/",
        },
      }
    );
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    crumb = (await res.text()).trim();
    crumbExpiry = Date.now() + 25 * 60 * 1000;
    console.log("[market-proxy] crumb refreshed:", crumb?.slice(0, 8) + "…");
  }

  async function yahooChart(symbol: string) {
    if (!crumb || Date.now() > crumbExpiry) await refreshSession();
    const url =
      `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
      `?range=1mo&interval=1d&crumb=${encodeURIComponent(crumb!)}`;
    const headers = {
      "User-Agent": UA,
      Accept: "application/json,text/plain,*/*",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "https://finance.yahoo.com/",
      ...(cookie ? { Cookie: cookie } : {}),
    };
    let res = await fetch(url, { headers });
    if (res.status === 401 || res.status === 429) {
      await refreshSession();
      res = await fetch(
        `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
          `?range=1mo&interval=1d&crumb=${encodeURIComponent(crumb!)}`,
        { headers: { ...headers, ...(cookie ? { Cookie: cookie } : {}) } }
      );
    }
    if (!res.ok) throw new Error(`Yahoo ${symbol}: ${res.status}`);
    return res.json();
  }

  return {
    name: "market-proxy",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(
        "/api/market",
        async (req: IncomingMessage, res: ServerResponse) => {
          try {
            const qs = new URLSearchParams(req.url?.split("?")[1] ?? "");
            const symbols = (qs.get("symbols") ?? "OSEBX.OL,BZ=F")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);

            const results = await Promise.allSettled(
              symbols.map(yahooChart)
            );
            const payload: Record<string, unknown> = {};
            for (let i = 0; i < symbols.length; i++) {
              const r = results[i];
              payload[symbols[i]] =
                r.status === "fulfilled"
                  ? r.value
                  : { error: r.reason?.message ?? String(r.reason) };
            }

            res.setHeader("Content-Type", "application/json");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.statusCode = 200;
            res.end(JSON.stringify(payload));
          } catch (err) {
            console.error("[market-proxy] error:", err);
            res.statusCode = 502;
            res.end(JSON.stringify({ error: String(err) }));
          }
        }
      );
    },
  };
}

export default defineConfig({
  plugins: [nodeShims(), marketProxy(), react(), tailwindcss()],
  resolve: {
    alias: {
      "ssb-motor": path.resolve(__dirname, "ssb-motor-src"),
    },
  },
  server: {
    port: 5199,
    // Proxy for APIs that might block CORS
    proxy: {
      "/api/kraft": {
        target: "https://www.hvakosterstrommen.no",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/kraft/, ""),
      },
    },
  },
});
