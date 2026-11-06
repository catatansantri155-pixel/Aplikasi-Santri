import assert from "node:assert/strict";
import { renderToStaticMarkup as render } from "react-dom/server";
import {
  validasiFoto,
  ukuranFoto,
  jalurFoto,
  kompresFoto,
  BATAS_FOTO,
} from "../src/lib/foto-profil";
import AvatarProfil from "../src/components/AvatarProfil";
import FotoProfil from "../src/components/FotoProfil";
const id = "11111111-1111-1111-1111-111111111111";
validasiFoto({ size: 10 * 1024 * 1024, type: "image/jpeg" });
for (const f of [
  { size: 0, type: "image/png" },
  { size: 11 * 1024 * 1024, type: "image/png" },
  { size: 100, type: "image/svg+xml" },
])
  assert.throws(() => validasiFoto(f));
assert.deepEqual(ukuranFoto(1200, 800), {
  x: 200,
  y: 0,
  sisi: 800,
  hasil: 384,
});
assert.deepEqual(ukuranFoto(80, 120), { x: 0, y: 20, sisi: 80, hasil: 80 });
assert.throws(() => ukuranFoto(0, 10));
assert.throws(() => ukuranFoto(10000, 10000));
assert.equal(jalurFoto(id), `${id}/avatar.webp`);
assert.throws(() => jalurFoto("../akun-lain"));
const avatar = render(<AvatarProfil id={id} nama="Akun Uji" />);
assert.ok(avatar.includes("AU") && !avatar.includes("<img"));
const editor = render(<FotoProfil id={id} nama="Akun Uji" />);
assert.ok(
  editor.includes('type="file"') &&
    editor.includes("100 KB") &&
    editor.includes("384"),
);
assert.ok(!editor.includes("Hapus foto") && !editor.includes("Simpan foto"));
// Uji kontrak pipeline canvas: output terlalu besar dikompres ulang, lalu bitmap ditutup.
let ditutup = false;
const kualitas: number[] = [];
let gambar: number[] = [];
Object.defineProperty(globalThis, "createImageBitmap", {
  configurable: true,
  value: async () => ({
    width: 1200,
    height: 800,
    close() {
      ditutup = true;
    },
  }),
});
Object.defineProperty(globalThis, "document", {
  configurable: true,
  value: {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({
        drawImage(...args: unknown[]) {
          gambar = args.slice(1) as number[];
        },
      }),
      toBlob(cb: (b: Blob) => void, type: string, q: number) {
        kualitas.push(q);
        cb(
          new Blob(
            [new Uint8Array(kualitas.length === 1 ? BATAS_FOTO + 1 : 40000)],
            { type },
          ),
        );
      },
    }),
  },
});
async function uji() {
  const b = await kompresFoto(
    new File(["foto"], "a.jpg", { type: "image/jpeg" }),
  );
  assert.equal(b.type, "image/webp");
  assert.equal(b.size, 40000);
  assert.deepEqual(kualitas, [0.82, 0.72]);
  assert.deepEqual(gambar, [200, 0, 800, 800, 0, 0, 384, 384]);
  assert.ok(ditutup);
  console.log(
    "Lulus: validasi berkas, crop/dimensi, batas ukuran, retry kompresi, penutupan bitmap, avatar cadangan dan UI upload.",
  );
}
uji().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
