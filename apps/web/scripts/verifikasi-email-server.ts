import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "../src/app/api/auth/konfirmasi/route";
async function main() {
  let calls = 0;
  const used = new Set<string>();
  (globalThis as any).__emailServer = {
    auth: {
      verifyOtp: async ({ token_hash }: any) => {
        calls++;
        const invalid = used.has(token_hash) || token_hash === "expired";
        used.add(token_hash);
        return { error: invalid ? { message: "invalid" } : null };
      },
    },
  };
  const request = (body: unknown, origin = "https://pondok.test") =>
    new NextRequest("https://pondok.test/api/auth/konfirmasi", {
      method: "POST",
      headers: { "Content-Type": "application/json", origin },
      body: JSON.stringify(body),
    });
  assert.equal(
    (
      await POST(
        request({ token_hash: "x", type: "email" }, "https://evil.test"),
      )
    ).status,
    403,
  );
  assert.equal(calls, 0);
  assert.equal(
    (await POST(request({ token_hash: "x", type: "invite" }))).status,
    400,
  );
  assert.equal(calls, 0);
  assert.equal(
    (await POST(request({ token_hash: "x".repeat(5000), type: "email" })))
      .status,
    400,
  );
  assert.equal(calls, 0);
  const recovery = await POST(
    request({
      token_hash: "recovery-1",
      type: "recovery",
      next: "https://evil.test",
    }),
  );
  assert.equal(recovery.status, 200);
  assert.equal((await recovery.json()).tujuan, "/atur-sandi");
  assert.equal(
    (await POST(request({ token_hash: "recovery-1", type: "recovery" })))
      .status,
    400,
  );
  const signup = await POST(
    request({ token_hash: "new-account", type: "email" }),
  );
  assert.equal((await signup.json()).tujuan, "/login?email=terkonfirmasi");
  assert.equal(signup.headers.get("Cache-Control"), "no-store");
  assert.equal(
    (await POST(request({ token_hash: "expired", type: "email" }))).status,
    400,
  );
  console.log(
    "PASS: confirmation API rejects cross-origin/invalid type/oversize, fixes redirect targets, supports recovery/signup and rejects replay/expiry (Auth mocked; email delivery not tested).",
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
