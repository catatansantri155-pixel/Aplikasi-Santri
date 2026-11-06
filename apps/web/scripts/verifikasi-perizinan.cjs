// Jalankan setelah npm ci: node scripts/verifikasi-perizinan.cjs
const { buildSync } = require("esbuild");
const { spawnSync } = require("node:child_process");
const { mkdirSync, unlinkSync, existsSync } = require("node:fs");
const { resolve } = require("node:path");
const app = resolve(__dirname, "..");
const out = resolve(app, "node_modules/.cache/santri-verifikasi-perizinan.cjs");
mkdirSync(resolve(app, "node_modules/.cache"), { recursive: true });
try {
  buildSync({
    entryPoints: [resolve(__dirname, "verifikasi-perizinan.tsx")],
    outfile: out,
    bundle: true,
    platform: "node",
    jsx: "automatic",
    packages: "external",
    tsconfig: resolve(app, "tsconfig.json"),
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
