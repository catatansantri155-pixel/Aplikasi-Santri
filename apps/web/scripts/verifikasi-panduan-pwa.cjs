const { build } = require("esbuild");
const { spawnSync } = require("node:child_process");
const { resolve } = require("node:path");
const { mkdirSync, unlinkSync, existsSync } = require("node:fs");
const app = resolve(__dirname, ".."),
  out = resolve(app, "node_modules/.cache/verifikasi-panduan-pwa.cjs");
mkdirSync(resolve(app, "node_modules/.cache"), { recursive: true });
(async () => {
  try {
    await build({
      entryPoints: [resolve(__dirname, "verifikasi-panduan-pwa.tsx")],
      outfile: out,
      bundle: true,
      platform: "node",
      jsx: "automatic",
      packages: "external",
      tsconfig: resolve(app, "tsconfig.json"),
      define: { "process.env.NODE_ENV": '"production"' },
      plugins: [
        {
          name: "mock-io",
          setup(b) {
            b.onResolve({ filter: /^@\/lib\/supabase\/client$/ }, () => ({
              path: "client",
              namespace: "mock",
            }));
            b.onResolve({ filter: /^next\/navigation$/ }, () => ({
              path: "navigation",
              namespace: "mock",
            }));
            b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({
              contents:
                a.path === "client"
                  ? "export function buatKlienBrowser(){return globalThis.__panduanClient}"
                  : 'export function usePathname(){return globalThis.__pathname||"/"}',
            }));
          },
        },
      ],
    });
    const r = spawnSync(process.execPath, [out], {
      cwd: app,
      stdio: "inherit",
      timeout: 30000,
    });
    if (r.error) throw r.error;
    process.exitCode = r.status ?? 1;
  } finally {
    if (existsSync(out)) unlinkSync(out);
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
