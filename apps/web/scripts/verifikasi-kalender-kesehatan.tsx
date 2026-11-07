import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { renderToStaticMarkup as render } from "react-dom/server";
import { menuUtamaBeranda, gambarMenu } from "../src/lib/beranda";
import { bolehAksesModul, modulDariPath } from "../src/lib/akses";
import { SEMUA_PERAN } from "../src/lib/peran";
import {
  hariKalender,
  geserBulan,
  batasBulan,
  agendaPadaHari,
  validasiKesehatan,
  validasiAgenda,
} from "../src/lib/pondok-layanan";
import Banner from "../src/components/BannerMotivasi";
import Kartu from "../src/components/KartuInformasi";
import type { InformasiPondok } from "../src/lib/data/informasi";
for (const role of SEMUA_PERAN) {
  const menu = menuUtamaBeranda(role);
  assert.ok(menu.length >= 8, role);
  assert.equal(new Set(menu.map((m) => m.href)).size, menu.length);
  for (const m of menu) {
    assert.ok(bolehAksesModul(role, m.modul));
    assert.ok(existsSync("public" + gambarMenu(m)));
  }
  assert.ok(menu.some((m) => m.href === "/kalender"));
  assert.equal(
    menu.some((m) => m.href === "/kesehatan"),
    ["admin", "wali", "musyrif"].includes(role),
  );
  assert.ok(
    !menu.some((m) => m.href === "/perizinan" || m.href === "/keuangan"),
  );
}
assert.deepEqual(menuUtamaBeranda(null), []);
for (const r of ["/kalender", "/kesehatan", "/banner"])
  assert.ok(modulDariPath(r));
assert.equal(geserBulan("2026-12", 1), "2027-01");
assert.equal(geserBulan("2026-01", -1), "2025-12");
const days = hariKalender("2024-02");
assert.equal(days.length, 42);
assert.ok(days.includes("2024-02-29"));
assert.equal(new Date(days[0] + "T12:00Z").getUTCDay(), 1);
assert.deepEqual(batasBulan("2026-12"), {
  mulai: "2026-11-30T17:00:00.000Z",
  selesai: "2026-12-31T17:00:00.000Z",
});
assert.throws(() => batasBulan("2026-13"));
assert.ok(
  agendaPadaHari(
    { mulai: "2026-11-06T16:30:00Z", selesai: "2026-11-06T17:30:00Z" },
    "2026-11-07",
  ),
);
assert.ok(
  !agendaPadaHari(
    { mulai: "2026-11-06T16:00:00Z", selesai: "2026-11-06T17:00:00Z" },
    "2026-11-07",
  ),
);
const health = {
  santri_id: "id",
  tanggal: "2026-11-06",
  keluhan: "Kondisi yang dilaporkan",
  tindakan: "Dicatat petugas",
  rujukan: "",
  status: "dipantau",
};
validasiKesehatan(health, "2026-11-07");
assert.throws(() =>
  validasiKesehatan({ ...health, tanggal: "2026-11-08" }, "2026-11-07"),
);
assert.throws(() =>
  validasiKesehatan({ ...health, keluhan: "x" }, "2026-11-07"),
);
validasiAgenda({
  judul: "Agenda pondok",
  mulai: "2026-11-06T01:00Z",
  selesai: "2026-11-06T02:00Z",
  jenis: "kegiatan",
  deskripsi: "",
  lokasi: "",
});
assert.throws(() =>
  validasiAgenda({
    judul: "Agenda pondok",
    mulai: "2026-11-06T01:00Z",
    selesai: "2026-11-06T00:00Z",
    jenis: "kegiatan",
    deskripsi: "",
    lokasi: "",
  }),
);
assert.ok(!render(<Banner />).includes("Kelola banner beranda"));
assert.ok(!render(<Banner admin />).includes('href="/banner"'));
const b: InformasiPondok = {
  id: "id",
  judul: "Informasi <aman>",
  isi: "Isi informasi aman untuk penerima.",
  status: "draf",
  kategori: "Pengumuman",
  tanggal: "2026-11-06",
  created_at: "",
  updated_at: "",
  tema: "hijau",
  gambar_path: null,
  revisi: 1,
};
assert.ok(!render(<Kartu data={b} />).includes(">Hapus<"));
const admin = render(<Kartu data={b} onHapus={() => {}} />);
assert.ok(admin.includes("Hapus") && admin.includes("&lt;aman&gt;"));
assert.ok(
  render(<Kartu data={b} onPulihkan={() => {}} />).includes(
    "Pulihkan sebagai draf",
  ),
);
console.log(
  "Lulus: ≥8 menu berizin pada 5 peran, WIB/kabisat, validasi kesehatan/agenda, kontrol banner admin dan arsip informasi.",
);
