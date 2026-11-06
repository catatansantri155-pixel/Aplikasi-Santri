import assert from "node:assert/strict";
import { renderToStaticMarkup as render } from "react-dom/server";
import { validasiInformasi } from "../src/lib/data/informasi";
import { labelJumlah, type Notifikasi } from "../src/lib/data/notifikasi";
import Daftar from "../src/components/DaftarNotifikasi";
import Penerima from "../src/components/PenerimaInformasi";
import Kartu from "../src/components/KartuInformasi";
import { modulDariPath, bolehAksesModul } from "../src/lib/akses";
import { SEMUA_PERAN } from "../src/lib/peran";
const isi = {
  judul: "Informasi pondok",
  isi: "Isi informasi untuk wali dan staf.",
  kategori: "Pengumuman",
  tanggal: "2026-11-06",
  status: "draf" as const,
};
const id = "11111111-1111-1111-1111-111111111111";
assert.equal(validasiInformasi(isi).sasaran, "semua");
assert.equal(
  validasiInformasi({
    ...isi,
    sasaran: "peran",
    sasaran_peran: "wali",
    sasaran_id: id,
  }).sasaran_id,
  null,
);
assert.throws(() =>
  validasiInformasi({ ...isi, sasaran: "peran", sasaran_peran: "superuser" }),
);
assert.throws(() => validasiInformasi({ ...isi, sasaran: "santri" }));
assert.throws(() =>
  validasiInformasi({ ...isi, berakhir_pada: "tanggal salah" }),
);
assert.equal(
  validasiInformasi({ ...isi, sasaran: "pengguna", sasaran_id: id }).sasaran_id,
  id,
);
assert.equal(labelJumlah(9), "9");
assert.equal(labelJumlah(10), "9+");
const n: Notifikasi = {
  id,
  judul: "Pengumuman <script>alert(1)</script>",
  kategori: "Pengumuman",
  tanggal: "2026-11-06",
  updated_at: "2026-11-06T04:00:00Z",
  revisi: 1,
  disematkan: true,
  wajib_konfirmasi: true,
  dibaca_pada: null,
  dikonfirmasi_pada: null,
};
const unread = render(<Daftar data={[n]} />);
assert.ok(
  unread.includes(`href="/informasi/${id}"`) &&
    unread.includes("Belum dibaca") &&
    unread.includes("Perlu konfirmasi"),
);
assert.ok(unread.includes("&lt;script&gt;") && !unread.includes("<script>"));
const read = render(
  <Daftar
    data={[
      { ...n, dibaca_pada: n.updated_at, dikonfirmasi_pada: n.updated_at },
    ]}
  />,
);
assert.ok(
  !read.includes("notifikasi-baru") && !read.includes("Perlu konfirmasi"),
);
const penerima = render(<Penerima nilai={isi} onUbah={() => {}} />);
for (const label of [
  "Seluruh pengguna",
  "Peran tertentu",
  "Wali satu kelas",
  "Wali seorang santri",
  "Satu akun",
  "Sematkan",
  "konfirmasi",
  "Berakhir pada",
])
  assert.ok(penerima.includes(label));
const kartu = render(
  <Kartu
    data={{
      ...isi,
      id,
      tema: "hijau",
      gambar_path: null,
      created_at: "",
      updated_at: "",
      disematkan: true,
    }}
    ringkas
  />,
);
assert.ok(kartu.includes("Disematkan") && kartu.includes(`/informasi/${id}`));
for (const p of ["/notifikasi", `/informasi/${id}`]) {
  assert.equal(modulDariPath(p), "laporan");
  for (const r of SEMUA_PERAN) assert.ok(bolehAksesModul(r, "laporan"));
}
console.log(
  "Lulus: validasi sasaran/masa tayang, badge, tautan detail, escaping judul, status baca/konfirmasi, opsi admin dan akses seluruh peran.",
);
