import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { renderToStaticMarkup as render } from "react-dom/server";
import BerandaMonitoring from "../src/components/BerandaMonitoring";
import PanelAnalitik, {
  type PropsPanelAnalitik,
} from "../src/components/PanelAnalitik";
import {
  DonatAnalitik,
  BatangAnalitik,
} from "../src/components/GrafikAnalitik";
import { modulBeranda, cariDiBeranda } from "../src/lib/beranda";

const expected = {
  admin: [
    "santri",
    "kehadiran",
    "hifzh",
    "diniyyah",
    "olahraga",
    "catatan",
    "laporan",
    "admin",
  ],
  pengajar_hifzh: [
    "santri",
    "kehadiran",
    "hifzh",
    "olahraga",
    "catatan",
    "laporan",
  ],
  pengajar_diniyyah: [
    "santri",
    "kehadiran",
    "diniyyah",
    "olahraga",
    "catatan",
    "laporan",
  ],
  musyrif: ["santri", "olahraga", "catatan", "laporan"],
  wali: ["santri", "laporan"],
} as const;
for (const [role, menu] of Object.entries(expected)) {
  const peran = role as keyof typeof expected;
  assert.deepEqual(
    modulBeranda(peran).map((m) => m.modul),
    menu,
  );
  const html = render(
    <BerandaMonitoring
      profil={{ nama: "Akun Uji", peran }}
      memuatProfil={false}
      memuatData={false}
      modeContoh={false}
      statistik={{
        santri: 17,
        setoran: 23,
        kehadiran: 7,
        catatan: 2,
        olahraga: 1,
      }}
      santri={[]}
      galat={false}
      onMuatUlang={() => {}}
    />,
  );
  assert.ok(
    !html.includes('href="/akun"'),
    "Tidak ada akun duplikat di header",
  );
  assert.ok(
    !html.includes("beranda-menu-panah"),
    "Tidak ada chevron pada tombol menu",
  );
  assert.ok(html.includes(">17</dd>") && html.includes(">23</dd>"));
  if (peran !== "admin") assert.ok(!html.includes('href="/admin"'));
  for (const m of modulBeranda(peran))
    assert.ok(
      existsSync(
        `public/images/menu/${m.modul === "laporan" ? "rekap" : m.modul}.webp`,
      ),
    );
}
assert.deepEqual(modulBeranda(null), []);
assert.equal(
  cariDiBeranda("  HIFZH ", modulBeranda("admin"), []).modul[0].href,
  "/hifzh",
);
assert.deepEqual(
  cariDiBeranda("Panel Admin", modulBeranda("wali"), []).modul,
  [],
);
const kosong = () => {};
const props: PropsPanelAnalitik = {
  data: {
    hadir: [
      { label: "1 Nov", nilai: 12 },
      { label: "8 Nov", nilai: 18 },
    ],
    setoran: [
      { label: "1 Nov", nilai: 4 },
      { label: "8 Nov", nilai: 9 },
    ],
    olahraga: [
      { label: "Okt", nilai: 2 },
      { label: "Nov", nilai: 3 },
    ],
    nilai: [
      { mapel: "Fikih", rata: 80 },
      { mapel: "Hadis", rata: 90 },
    ],
    komposisi: { hadir: 30, sakit: 3, izin: 5, alpa: 2, total: 40 },
    hasil: { l: 9, u: 4 },
  },
  galat: {
    hadir: null,
    setoran: null,
    olahraga: null,
    nilai: null,
    komposisi: null,
  },
  muatUlang: {
    hadir: kosong,
    setoran: kosong,
    olahraga: kosong,
    nilai: kosong,
    komposisi: kosong,
  },
  semester: [{ id: "gasal", label: "Semester Gasal" }],
  semesterId: "gasal",
  onSemester: kosong,
};
const html = render(<PanelAnalitik {...props} />);
assert.equal(
  (html.match(/<section /g) ?? []).length,
  6,
  "Enam analitik tetap ada",
);
assert.ok(
  html.includes(">30</strong>") &&
    html.includes(">13</strong>") &&
    html.includes(">85</strong>") &&
    html.includes(">5</strong>"),
  "KPI sesuai agregat fixture",
);
assert.ok(
  html.includes('value="gasal" selected=""'),
  "Filter semester mempertahankan pilihan",
);
assert.ok(
  html.includes("Fikih") &&
    html.includes("Hadis") &&
    html.includes("Lihat data"),
);
assert.ok(!html.includes("NaN") && !html.includes("Infinity"));
const donut = render(
  <DonatAnalitik
    label="uji"
    bagian={[
      { label: "Lancar", nilai: 3, warna: "#218a7b" },
      { label: "Ulang", nilai: 1, warna: "#e9b850" },
    ]}
  />,
);
assert.ok(
  donut.includes("75 25") && donut.includes("25 75"),
  "Segmen donat berskala akurat",
);
assert.ok(donut.includes("75%") && donut.includes("25%"));
const nol = render(
  <BatangAnalitik
    data={[
      { label: "Nov", nilai: 0 },
      { label: "Des", nilai: 2 },
    ]}
    satuan="Sesi"
  />,
);
assert.ok(nol.includes("height:0%"), "Nol tidak dibuat menjadi batang positif");
const loading = render(
  <PanelAnalitik
    {...props}
    data={{
      hadir: null,
      setoran: null,
      olahraga: null,
      nilai: null,
      komposisi: null,
      hasil: null,
    }}
  />,
);
assert.ok(loading.includes("Memuat data") && !loading.includes("NaN"));
const error = render(
  <PanelAnalitik {...props} galat={{ ...props.galat, hadir: "Uji gagal" }} />,
);
assert.ok(
  error.includes("Coba lagi") &&
    !error
      .slice(0, error.indexOf('class="analitik-kisi"'))
      .includes(">30</strong>"),
  "KPI gagal tidak menampilkan angka lama",
);
const single = render(
  <PanelAnalitik
    {...props}
    data={{ ...props.data, setoran: [{ label: "8 Nov", nilai: 3 }] }}
  />,
);
assert.ok(single.includes("Tren tersedia setelah beberapa periode tercatat."));
console.log(
  "Lulus: menu 5 peran, gambar lokal, pencarian berizin, 6 analitik, KPI, semester, proporsi, nol, memuat, galat, satu periode.",
);
