import assert from "node:assert/strict";
import { renderToStaticMarkup as render } from "react-dom/server";
import Rincian from "../src/components/RincianAktivitas";
const data = { santri: 17, setoran: 8, kehadiran: 4, catatan: 0, olahraga: 2 };
const props = {
  statistik: data,
  wali: false,
  memuat: false,
  galat: false,
  onMuatUlang() {},
};
const html = render(<Rincian {...props} />);
assert.ok(
  html.includes('aria-label="Setoran hari ini: 8"') &&
    html.includes('aria-label="Kehadiran hari ini: 4"'),
);
assert.ok(
  html.includes("width:100%") &&
    html.includes("width:50%") &&
    html.includes("width:0%"),
);
assert.ok(html.includes(">17</dd>") && html.includes(">2</dd>"));
assert.ok(!html.includes("<details") && !html.includes("<summary"));
const nol = render(
  <Rincian
    {...props}
    statistik={{ santri: 0, setoran: 0, kehadiran: 0, catatan: 0, olahraga: 0 }}
  />,
);
assert.equal((nol.match(/width:0%/g) ?? []).length, 3);
assert.ok(
  nol.includes("Belum ada aktivitas tercatat") &&
    !nol.includes("NaN") &&
    !nol.includes("Infinity"),
);
for (const state of [{ memuat: true }, { galat: true }, { statistik: null }]) {
  const h = render(<Rincian {...props} {...state} />);
  assert.ok(
    !h.includes("aktivitas-track") && !h.includes(">17</dd>"),
    "Jangan menggambar angka lama saat memuat/gagal",
  );
}
const wali = render(<Rincian {...props} wali />);
assert.ok(
  wali.includes("Anak tertaut") &&
    wali.includes("Setoran tercatat") &&
    !wali.includes("Sesi olahraga pekan ini"),
);
const invalid = render(
  <Rincian {...props} statistik={{ ...data, setoran: Number.NaN }} />,
);
assert.ok(
  invalid.includes("Coba lagi") && !invalid.includes("aktivitas-track"),
);
console.log(
  "Lulus: skala batang akurat, nol tidak diberi tinggi/angka palsu, state memuat/gagal, wali, tanpa accordion.",
);

// A live statistics response includes child metadata as well as numeric counts.
const payload = { ...data, anak: { anakA: { setoran: 8, kehadiran: 4 } } };
for (const isWali of [true, false]) {
  const h = render(<Rincian {...props} statistik={payload} wali={isWali} />);
  assert.ok(
    h.includes("aktivitas-track") && !h.includes("Rincian belum dapat dimuat"),
  );
}
