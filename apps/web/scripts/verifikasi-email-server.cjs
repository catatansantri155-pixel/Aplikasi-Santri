const { build } = require("esbuild");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const out = "node_modules/.cache/verifikasi-email-server.cjs";
(async () => {
  try {
    await build({
      entryPoints: ["scripts/verifikasi-email-server.ts"],
      outfile: out,
      bundle: true,
      platform: "node",
      packages: "external",
      tsconfig: "tsconfig.json",
      plugins: [
        {
          name: "fixture",
          setup(b) {
            b.onResolve({ filter: /^@\/lib\/supabase\/server$/ }, () => ({
              path: "server",
              namespace: "fixture",
            }));
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents:
                "export async function buatKlienServer(){return globalThis.__emailServer}",
            }));
          },
        },
      ],
    });
    const r = spawnSync(process.execPath, [out], {
      stdio: "inherit",
      timeout: 30000,
    });
    process.exitCode = r.status ?? 1;
  } finally {
    if (fs.existsSync(out)) fs.unlinkSync(out);
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
