import assert from "node:assert/strict";
import { renderToStaticMarkup as render } from "react-dom/server";
import {
  angkaRupiah,
  validasiTagihan,
  validasiPembayaran,
  progresPelunasan,
  selCsv,
  hariWib,
  type TagihanBaru,
  type PembayaranBaru,
} from "../src/lib/keuangan";
import { fiturTambahan } from "../src/lib/fitur-tambahan";
import { modulBeranda } from "../src/lib/beranda";
import { modulDariPath, bolehAksesModul } from "../src/lib/akses";
import { SEMUA_PERAN } from "../src/lib/peran";
import { tujuanNotifikasi, type Notifikasi } from "../src/lib/data/notifikasi";
import Lainnya from "../src/app/lainnya/page";
import Progres from "../src/components/ProgresKeuangan";
import Daftar from "../src/components/DaftarNotifikasi";
assert.equal(angkaRupiah("500000"), 500000);
for (const s of [
  "0",
  "-1",
  "1.5",
  "1e5",
  "1,000",
  "1.000",
  "1000000001",
  "NaN",
  "",
])
  assert.throws(() => angkaRupiah(s));
const d: TagihanBaru = {
  kunci: "a",
  santri_ids: ["b"],
  judul: "SPP November",
  jenis: "spp",
  periode: "2026-11-01",
  nominal: 500000,
  jatuh_tempo: "2026-11-10",
  catatan: "",
};
validasiTagihan(d);
for (const perubahan of [
  { santri_ids: [] },
  { santri_ids: ["b", "b"] },
  { santri_ids: Array.from({ length: 501 }, (_, i) => String(i)) },
  { periode: "2026-11-02" },
  { jatuh_tempo: "2026-02-30" },
  { nominal: 0 },
  { judul: "a" },
  { catatan: "a".repeat(2001) },
])
  assert.throws(() => validasiTagihan({ ...d, ...perubahan }));
const bayar: PembayaranBaru = {
  kunci: "x",
  nominal: 200000,
  tanggal_bayar: hariWib(),
  metode: "transfer",
  pengirim: "Wali Santri",
  bukti_path: "own/proof.webp",
  catatan: "Cicilan",
};
validasiPembayaran(bayar, 300000, true);
assert.throws(() => validasiPembayaran(bayar, 100000, true));
assert.throws(() =>
  validasiPembayaran({ ...bayar, bukti_path: null }, 300000, true),
);
assert.throws(() =>
  validasiPembayaran({ ...bayar, metode: "tunai" }, 300000, true),
);
assert.throws(() =>
  validasiPembayaran({ ...bayar, tanggal_bayar: "2200-01-01" }, 300000, true),
);
validasiPembayaran(
  { ...bayar, metode: "tunai", bukti_path: null },
  300000,
  false,
);
assert.equal(progresPelunasan(100000, 25000), 25);
assert.equal(progresPelunasan(0, 0), 0);
assert.equal(progresPelunasan(100, 110), 100);
const kosong = render(<Progres total={0} terbayar={0} />),
  sebagian = render(<Progres total={100000} terbayar={25000} />);
assert.ok(
  kosong.includes("width:0%") && kosong.includes("Belum ada nominal tagihan"),
);
assert.ok(
  sebagian.includes("width:25%") && sebagian.includes('aria-valuenow="25"'),
);
for (const s of ["=HYPERLINK(x)", "+SUM(1)", "@cmd", "-cmd", " =1+1", "\t=1"]) {
  assert.ok(selCsv(s).startsWith("\"'"));
}
assert.equal(selCsv('Nama "Wali"'), '"Nama ""Wali"""');
for (const peran of SEMUA_PERAN) {
  const akses = peran === "admin" || peran === "wali";
  assert.equal(bolehAksesModul(peran, "keuangan"), akses);
  assert.equal(
    fiturTambahan(peran).some((f) => f.href === "/keuangan"),
    akses,
  );
  assert.ok(!modulBeranda(peran).some((m) => m.href === "/keuangan"));
}
assert.equal(modulDariPath("/keuangan/abc"), "keuangan");
assert.equal(fiturTambahan(null).length, 0);
const n: Notifikasi = {
  id: "n",
  tujuan_id: "t",
  sumber: "keuangan",
  judul: "SPP <script>uji</script>",
  kategori: "Keuangan / SPP",
  tanggal: "2026-11-06",
  updated_at: "2026-11-06T00:00:00Z",
  revisi: 1,
  disematkan: false,
  wajib_konfirmasi: false,
  dibaca_pada: null,
  dikonfirmasi_pada: null,
};
assert.equal(tujuanNotifikasi(n), "/keuangan/t");
assert.ok(render(<Daftar data={[n]} />).includes('href="/keuangan/t"'));
assert.ok(!render(<Daftar data={[n]} />).includes("<script>"));
const menu = decodeURIComponent(render(<Lainnya />));
assert.ok(
  menu.includes('href="/keuangan"') &&
    menu.includes("/images/fitur/keuangan.webp"),
);
console.log(
  "Keuangan: validasi rupiah/tanggal/cicilan, akses lima peran, penempatan menu, progres akurat, CSV aman dan rute notifikasi lulus.",
);
