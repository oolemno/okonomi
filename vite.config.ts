import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

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

export default defineConfig({
  plugins: [nodeShims(), react(), tailwindcss()],
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
