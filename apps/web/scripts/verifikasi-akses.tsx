import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import ts from "typescript";
import { renderToStaticMarkup as render } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import Login from "../src/app/login/page";
import Daftar from "../src/app/daftar/page";
import Lupa from "../src/app/lupa-sandi/page";
import Atur from "../src/app/atur-sandi/page";
import Sambutan from "../src/app/sambutan/page";
import Logo from "../src/components/Logo";
import manifest from "../src/app/manifest";
const router = {
  bfcacheId: "uji-akses",
  back() {},
  forward() {},
  refresh() {},
  hmrRefresh() {},
  replace() {},
  push() {},
  prefetch() {},
};
for (const [name, Page] of Object.entries({
  login: Login,
  daftar: Daftar,
  lupa: Lupa,
  atur: Atur,
  sambutan: Sambutan,
})) {
  const html = render(
    <AppRouterContext.Provider value={router}>
      <Page />
    </AppRouterContext.Provider>,
  );
  assert.ok(
    html.includes("/brand/minhajus-sunnah.webp"),
    `${name}: logo konsisten`,
  );
  assert.equal(
    (html.match(/alt="Logo Minhajus Sunnah Magelang"/g) ?? []).length,
    1,
    `${name}: satu logo terlihat`,
  );
  assert.ok(html.includes("/images/akses-3d.webp"), `${name}: ilustrasi lokal`);
  assert.ok(html.includes("<h1"), `${name}: judul utama`);
  assert.ok(
    !html.includes("auth-visual-bingkai") && !html.includes("data:image/"),
    `${name}: visual lama tidak termuat`,
  );
  if (name === "login")
    assert.ok(
      html.includes('type="email"') &&
        html.includes('autoComplete="current-password"') &&
        html.includes('href="/lupa-sandi"') &&
        html.includes('href="/daftar"'),
    );
  if (name === "daftar") {
    assert.equal((html.match(/type="password"/g) ?? []).length, 2);
    assert.ok(!html.includes("<select"), "Pendaftar tidak memilih peran");
  }
  if (name === "sambutan")
    assert.equal((html.match(/aria-label="Bagian /g) ?? []).length, 5);
}
const mark = render(<Logo ukuran={40} />);
assert.ok(mark.includes('width="40"') && mark.includes("object-fit:contain"));
for (const item of manifest().icons ?? [])
  assert.ok(existsSync(`public${item.src}`));
function authLogic(source: string) {
  const file = ts.createSourceFile(
    "page.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const f = file.statements.find(
    (n) =>
      ts.isFunctionDeclaration(n) &&
      n.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword),
  ) as ts.FunctionDeclaration;
  const text = f
    .body!.statements.filter((n) => !ts.isReturnStatement(n))
    .map((n) =>
      ts
        .createPrinter({ removeComments: true })
        .printNode(ts.EmitHint.Unspecified, n, file),
    )
    .join("\n");
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    true,
    ts.LanguageVariant.Standard,
    text,
  );
  const tokens: string[] = [];
  while (scanner.scan() !== ts.SyntaxKind.EndOfFileToken)
    tokens.push(scanner.getTokenText());
  return JSON.stringify(tokens);
}
// These unchanged flows retain their regression snapshot. Signup/password changes
// are covered by the audit suite and server tests instead of comparing old code.
for (const page of ["login", "lupa-sandi"]) {
  const path = `src/app/${page}/page.tsx`;
  const old = execFileSync("git", ["show", `HEAD:apps/web/${path}`], {
    encoding: "utf8",
  });
  assert.equal(
    authLogic(readFileSync(path, "utf8")),
    authLogic(old),
    `${page}: alur autentikasi dipertahankan`,
  );
}
console.log(
  "Lulus: 5 halaman akses, logo tunggal, ilustrasi, kolom login/daftar, lima slide, ikon aplikasi, dan regresi login/pemulihan.",
);
