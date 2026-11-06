import assert from "node:assert/strict";
import { renderToStaticMarkup as render } from "react-dom/server";
import {
  pilihanAksi,
  isoWib,
  inputWib,
  validasiPengajuan,
  type DataPengajuan,
} from "../src/lib/perizinan";
import { fiturTambahan } from "../src/lib/fitur-tambahan";
import { modulBeranda } from "../src/lib/beranda";
import { modulDariPath, bolehAksesModul } from "../src/lib/akses";
import { SEMUA_PERAN } from "../src/lib/peran";
import { tujuanNotifikasi, type Notifikasi } from "../src/lib/data/notifikasi";
import Daftar from "../src/components/DaftarNotifikasi";
import Lainnya from "../src/app/lainnya/page";
const date = "2026-12-31T23:30";
assert.equal(isoWib(date), "2026-12-31T16:30:00.000Z");
assert.equal(inputWib(isoWib(date)), date);
assert.throws(() => isoWib("2026-02-30T12:00"));
assert.throws(() => isoWib("not a date"));
const data: DataPengajuan = {
  kunci: "a",
  santri_id: "b",
  jenis: "keluar",
  alasan: "Acara keluarga",
  tujuan: "Rumah keluarga",
  rencana_keluar: isoWib(date),
  rencana_kembali: isoWib("2027-01-01T10:00"),
  penjemput: "Ayah Santri",
  hubungan: "Ayah",
  kontak: "+62 812 3456 7890",
  lampiran_path: null,
};
validasiPengajuan(data, Date.parse("2026-11-06"));
for (const perubahan of [
  { alasan: "a" },
  { kontak: "123" },
  { kontak: "abcdefgh12345678" },
  { rencana_kembali: data.rencana_keluar },
  { rencana_keluar: "2020-01-01" },
  { jenis: "lain" },
])
  assert.throws(() =>
    validasiPengajuan({ ...data, ...perubahan }, Date.parse("2026-11-06")),
  );
for (const peran of SEMUA_PERAN) {
  const akses = ["admin", "musyrif", "wali"].includes(peran);
  assert.equal(bolehAksesModul(peran, "perizinan"), akses);
  assert.equal(
    fiturTambahan(peran).some((f) => f.href === "/perizinan"),
    akses,
  );
  assert.ok(!modulBeranda(peran).some((m) => m.href === "/perizinan"));
}
assert.equal(fiturTambahan(null).length, 0);
assert.equal(modulDariPath("/perizinan/abc"), "perizinan");
assert.deepEqual(pilihanAksi("wali", "menunggu", true), ["batalkan"]);
assert.deepEqual(pilihanAksi("wali", "menunggu", false), []);
assert.deepEqual(pilihanAksi("pengajar_hifzh", "menunggu", true), []);
assert.deepEqual(pilihanAksi("admin", "disetujui", false), [
  "keluar",
  "batalkan",
]);
assert.deepEqual(pilihanAksi("musyrif", "sedang_izin", false), ["kembali"]);
assert.deepEqual(pilihanAksi("wali", "sedang_izin", true), []);
assert.deepEqual(pilihanAksi("admin", "sudah_kembali", false), []);
const n: Notifikasi = {
  id: "notif",
  tujuan_id: "izin",
  sumber: "perizinan",
  judul: "Izin <script>uji</script>",
  kategori: "Perizinan",
  tanggal: "2026-11-06",
  updated_at: "2026-11-06T01:00:00Z",
  revisi: 3,
  disematkan: false,
  wajib_konfirmasi: false,
  dibaca_pada: null,
  dikonfirmasi_pada: null,
};
assert.equal(tujuanNotifikasi(n), "/perizinan/izin");
assert.equal(tujuanNotifikasi({ ...n, sumber: undefined }), "/informasi/notif");
const html = render(<Daftar data={[n]} />);
assert.ok(
  html.includes('href="/perizinan/izin"') &&
    html.includes("&lt;script&gt;") &&
    !html.includes("<script>"),
);


const menu=render(<Lainnya/>);
assert.ok(menu.includes('href="/perizinan"') && decodeURIComponent(menu).includes('/images/fitur/perizinan.webp'));
assert.ok(menu.includes('fitur-bulat') && !menu.includes('lainnya-item'));

console.log("Perizinan: WIB, validation, roles, transitions, circle menus and notification routing passed.");
