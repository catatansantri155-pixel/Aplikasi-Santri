const { build } = require("esbuild");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const out = path.resolve("node_modules/.cache/verifikasi-perbaikan-audit.cjs");
(async () => {
  try {
    await build({
      entryPoints: ["scripts/verifikasi-perbaikan-audit.ts"],
      outfile: out,
      bundle: true,
      platform: "node",
      packages: "external",
      tsconfig: "tsconfig.json",
      plugins: [
        {
          name: "client-fixture",
          setup(b) {
            b.onResolve({ filter: /^@\/lib\/supabase\/client$/ }, () => ({
              path: "client",
              namespace: "fixture",
            }));
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents:
                "export function buatKlienBrowser(){return globalThis.__auditClient}",
            }));
          },
        },
      ],
    });
    const r = spawnSync(process.execPath, [out], {
      stdio: "inherit",
      timeout: 30000,
      env: {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "fixture",
      },
    });
    process.exitCode = r.status ?? 1;
  } finally {
    if (fs.existsSync(out)) fs.unlinkSync(out);
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
