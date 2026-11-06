import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { renderToStaticMarkup as render } from "react-dom/server";
import {
  batasPeriode,
  cocokPeriode,
  SEMUA_PERIODE,
} from "../src/lib/filter-periode";
import {
  validasiInformasi,
  type IsianInformasi,
} from "../src/lib/data/informasi";
import InformasiPondok from "../src/components/InformasiPondok";
import BannerMotivasi, {
  BANNER_MOTIVASI,
} from "../src/components/BannerMotivasi";
import Beranda from "../src/components/BerandaMonitoring";
assert.deepEqual(batasPeriode({ mode: "bulan", nilai: "2024-02" }), {
  mulai: "2024-02-01",
  selesai: "2024-02-29",
});
assert.deepEqual(batasPeriode({ mode: "bulan", nilai: "2025-02" }), {
  mulai: "2025-02-01",
  selesai: "2025-02-28",
});
assert.deepEqual(batasPeriode({ mode: "tahun", nilai: "2026" }), {
  mulai: "2026-01-01",
  selesai: "2026-12-31",
});
assert.equal(batasPeriode(SEMUA_PERIODE), null);
for (const nilai of [
  "2025-02-29",
  "2026-13-01",
  "2026-11-00",
  "2026-11-31",
  "",
])
  assert.throws(() => batasPeriode({ mode: "tanggal", nilai }));
assert.ok(cocokPeriode("2026-11-30", { mode: "bulan", nilai: "2026-11" }));
assert.ok(!cocokPeriode("2026-12-01", { mode: "bulan", nilai: "2026-11" }));
assert.ok(!cocokPeriode("2026-11-01", { mode: "tahun", nilai: "26" }));
const isi: IsianInformasi = {
  judul: " Judul informasi ",
  isi: " Isi informasi untuk seluruh akun pondok. ",
  status: "draf",
  kategori: "Pengumuman",
  tanggal: "2026-11-05",
};
assert.equal(validasiInformasi(isi).judul, "Judul informasi");
assert.throws(() => validasiInformasi({ ...isi, judul: "a" }));
assert.throws(() => validasiInformasi({ ...isi, isi: "singkat" }));
assert.throws(() => validasiInformasi({ ...isi, tanggal: "2026-02-30" }));
assert.equal(BANNER_MOTIVASI.length, 7);
for (let i = 1; i <= 7; i++)
  assert.ok(existsSync(`public/images/banner/suasana-${i}.webp`));
const banner = render(<BannerMotivasi />);
assert.equal((banner.match(/aria-label="Banner \d:/g) ?? []).length, 7);
assert.ok(
  !banner.includes("Jeda") &&
    !banner.includes("Lanjutkan") &&
    !banner.includes("banner-keterangan"),
);
assert.ok(render(<InformasiPondok peran="admin" />).includes("Buat informasi"));
for (const peran of [
  "wali",
  "musyrif",
  "pengajar_hifzh",
  "pengajar_diniyyah",
] as const)
  assert.ok(
    !render(<InformasiPondok peran={peran} />).includes("Buat informasi"),
  );
const home = render(
  <Beranda
    profil={{ nama: "Admin", peran: "admin" }}
    memuatProfil={false}
    memuatData={false}
    modeContoh={false}
    statistik={{ santri: 1, setoran: 2, kehadiran: 3, catatan: 4, olahraga: 5 }}
    santri={[]}
    galat={false}
    onMuatUlang={() => {}}
  >
    <div>ANAK-SEBELUM-RINCIAN</div>
  </Beranda>,
);
assert.ok(
  home.includes('href="/lainnya"') &&
    home.includes("Informasi Terbaru dari Pondok"),
);
assert.ok(
  !home.includes("Ringkasan Hari Ini") && !home.includes("beranda-info-pondok"),
);
assert.ok(
  home.indexOf("banner-gambar") > home.indexOf('id="judul-menu-beranda"'),
);
assert.ok(
  home.indexOf("ANAK-SEBELUM-RINCIAN") <
    home.indexOf("beranda-aktivitas-terakhir"),
);
assert.ok(home.includes("beranda-menu-lingkaran"));
assert.ok(!home.includes("<details") && home.includes("Rincian aktivitas"));
console.log(
  "Lulus: periode/tahun kabisat, validasi informasi, 7 aset dan kontrol banner, form admin, urutan beranda dan rincian terbawah.",
);

const gambar =
  "11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.webp";
assert.equal(
  validasiInformasi({ ...isi, isi: "", gambar_path: gambar }).isi,
  "",
);
assert.throws(() =>
  validasiInformasi({
    ...isi,
    isi: "",
    gambar_path: "https://example.com/a.png",
  }),
);
assert.throws(() =>
  validasiInformasi({ ...isi, isi: "x".repeat(12001), gambar_path: gambar }),
);
assert.throws(() =>
  validasiInformasi({
    ...isi,
    isi: "Silakan isi [tanggal] kegiatan",
    status: "terbit",
  }),
);
assert.equal(validasiInformasi({ ...isi, tema: "emas" }).tema, "emas");
import { validasiBerkasGambar } from "../src/lib/data/gambar-informasi";
assert.throws(() => validasiBerkasGambar({ type: "image/svg+xml", size: 50 }));
assert.throws(() => validasiBerkasGambar({ type: "image/png", size: 5242881 }));
assert.throws(() => validasiBerkasGambar({ type: "image/png", size: 0 }));
validasiBerkasGambar({ type: "image/jpeg", size: 5242880 });
import KartuInformasi from "../src/components/KartuInformasi";
const kartu = render(
  <KartuInformasi
    data={{
      ...isi,
      id: "uji",
      tema: "biru",
      gambar_path: gambar,
      gambar_url: "https://example.com/poster.png",
      created_at: "",
      updated_at: "",
    }}
  />,
);
assert.ok(
  kartu.includes("informasi-sampul-judul") &&
    kartu.includes("informasi-tema-biru") &&
    kartu.includes("Lihat gambar utuh"),
);
const teks = render(
  <KartuInformasi
    data={{
      ...isi,
      id: "uji",
      tema: "emas",
      gambar_path: null,
      created_at: "",
      updated_at: "",
    }}
  />,
);
assert.ok(
  !teks.includes("informasi-sampul") && teks.includes("informasi-tema-emas"),
);
console.log(
  "Lulus: poster opsional, batas berkas, validasi template sebelum terbit, kartu gambar dan teks.",
);
