"use client";

/**
 * Halaman Panel Admin — kelola data induk, KHUSUS admin:
 * 1) Santri: daftar semua santri per kelas (termasuk nonaktif),
 *    tambah, ubah nama / nama ayah-wali / kelas, aktif/nonaktifkan.
 * 2) Semester: daftar semester lengkap + buat baru. Skema TIDAK
 *    punya kolom penanda aktif — lencana keadaan semester di sini
 *    diturunkan dari rentang tanggalnya (lihat catatan di halaman).
 * 3) Tautan Wali: akun berperan wali dari tabel profiles, santri
 *    yang tertaut kepadanya, tambah & lepas tautan. Akun login wali
 *    sendiri dibuat lewat panel autentikasi Supabase, BUKAN di sini.
 *
 * Gerbang peran: PenjagaModul modul "admin" (src/lib/akses.ts) —
 * hanya admin yang melihat isi halaman ini, termasuk lewat URL
 * langsung; penegakan asli tetap RLS (tulis santri / semester /
 * wali_santri khusus admin di database).
 *
 * Selama env Supabase belum terisi, semua berjalan di atas DATA
 * CONTOH FIKSI (gudang contoh di memori) dan halaman menandainya.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import PenandaTahap from "@/components/PenandaTahap";
import KartuGalat from "@/components/KartuGalat";
import PenjagaModul from "@/components/PenjagaModul";
import AvatarInisial from "@/components/AvatarInisial";
import { LingkaranIkon } from "@/components/Ikon";
import {
  ambilProfilSaya,
  type ProfilSaya,
} from "@/lib/data/kehadiran";
import {
  ambilAkunWali,
  ambilKelasAdmin,
  ambilSemesterAdmin,
  ambilSemuaSantriAdmin,
  ambilTautanWali,
  aturStatusAktifSantriAdmin,
  hapusTautanWali,
  statusSemester,
  tambahSantriAdmin,
  tambahSemesterAdmin,
  tambahTautanWali,
  ubahSantriAdmin,
  LABEL_SEMESTER,
  LABEL_STATUS_SEMESTER,
  type AkunWali,
  type JenisSemester,
  type KelasRingkasan,
  type Santri,
  type SemesterLengkap,
  type TautanWali,
} from "@/lib/data/admin";

/** "1 Jul 2026" dari tanggal ISO YYYY-MM-DD (gaya ringkas beranda). */
function formatTanggalSingkat(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function HalamanAdmin() {
  return (
    <PenjagaModul modul="admin">
      <IsiHalamanAdmin />
    </PenjagaModul>
  );
}

function IsiHalamanAdmin() {
  const [, setProfil] = useState<ProfilSaya | null>(null);
  const [daftarKelas, setDaftarKelas] = useState<KelasRingkasan[]>([]);
  const [semuaSantri, setSemuaSantri] = useState<Santri[]>([]);
  const [daftarSemester, setDaftarSemester] = useState<SemesterLengkap[]>([]);
  const [daftarWali, setDaftarWali] = useState<AkunWali[]>([]);
  const [daftarTautan, setDaftarTautan] = useState<TautanWali[]>([]);
  const [sumberContoh, setSumberContoh] = useState(false);
  const [galatMuat, setGalatMuat] = useState<string | null>(null);

  // Formulir tambah santri
  const [namaBaru, setNamaBaru] = useState("");
  const [ayahBaru, setAyahBaru] = useState("");
  const [kelasBaruId, setKelasBaruId] = useState("");
  const [pesanSantri, setPesanSantri] = useState<string | null>(null);
  const [sedangSimpanSantri, setSedangSimpanSantri] = useState(false);

  // Formulir ubah santri (satu baris pada satu waktu)
  const [editId, setEditId] = useState<string | null>(null);
  const [namaEdit, setNamaEdit] = useState("");
  const [ayahEdit, setAyahEdit] = useState("");
  const [kelasEditId, setKelasEditId] = useState("");

  // Formulir semester baru
  const [namaSemester, setNamaSemester] = useState("");
  const [jenisSemester, setJenisSemester] = useState<JenisSemester>("gasal");
  const [tahunAjaran, setTahunAjaran] = useState("");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalSelesai, setTanggalSelesai] = useState("");
  const [pesanSemester, setPesanSemester] = useState<string | null>(null);
  const [sedangSimpanSemester, setSedangSimpanSemester] = useState(false);

  // Formulir tautan wali
  const [waliPilih, setWaliPilih] = useState("");
  const [santriPilih, setSantriPilih] = useState("");
  const [pesanTautan, setPesanTautan] = useState<string | null>(null);
  const [sedangSimpanTautan, setSedangSimpanTautan] = useState(false);

  const muatSemua = useCallback(async () => {
    const [kelasHasil, santriHasil, semesterHasil, waliHasil, tautanHasil] =
      await Promise.all([
        ambilKelasAdmin(),
        ambilSemuaSantriAdmin(),
        ambilSemesterAdmin(),
        ambilAkunWali(),
        ambilTautanWali(),
      ]);
    setDaftarKelas(kelasHasil.data);
    setSemuaSantri(santriHasil.data);
    setDaftarSemester(semesterHasil.data);
    setDaftarWali(waliHasil.data);
    setDaftarTautan(tautanHasil.data);
    setSumberContoh(
      kelasHasil.sumberContoh ||
        santriHasil.sumberContoh ||
        semesterHasil.sumberContoh ||
        waliHasil.sumberContoh ||
        tautanHasil.sumberContoh,
    );
    setKelasBaruId((lama) => lama || kelasHasil.data[0]?.id || "");
    setWaliPilih((lama) => lama || waliHasil.data[0]?.id || "");
    setSantriPilih((lama) => lama || santriHasil.data[0]?.id || "");
  }, []);

  /* Muat profil + semua data panel; juga target tombol coba lagi. */
  const muatAwal = useCallback(async () => {
    setGalatMuat(null);
    try {
      const [profilHasil] = await Promise.all([
        ambilProfilSaya(),
        muatSemua(),
      ]);
      setProfil(profilHasil.data);
    } catch (e: unknown) {
      setGalatMuat(
        e instanceof Error ? e.message : "Gagal memuat data panel admin.",
      );
    }
  }, [muatSemua]);

  useEffect(() => {
    void muatAwal();
  }, [muatAwal]);

  /* Kelompok santri per kelas, mengikuti urutan tingkat kelas. */
  const kelompokSantri = useMemo(() => {
    const kelompok = daftarKelas.map((kelas) => ({
      kelas,
      santri: semuaSantri.filter((s) => s.kelasId === kelas.id),
    }));
    const tanpaKelas = semuaSantri.filter(
      (s) => !daftarKelas.some((k) => k.id === s.kelasId),
    );
    if (tanpaKelas.length > 0) {
      kelompok.push({
        kelas: { id: "tanpa-kelas", tingkat: 0, nama: "Tanpa Kelas" },
        santri: tanpaKelas,
      });
    }
    return kelompok;
  }, [daftarKelas, semuaSantri]);

  const santriDariId = useCallback(
    (id: string) => semuaSantri.find((s) => s.id === id) ?? null,
    [semuaSantri],
  );

  const jumlahAktif = semuaSantri.filter((s) => s.statusAktif).length;

  /* ---------------- Santri: tambah / ubah / status ---------------- */

  async function tanganiTambahSantri() {
    setPesanSantri(null);
    setSedangSimpanSantri(true);
    try {
      const hasil = await tambahSantriAdmin({
        nama: namaBaru,
        namaAyahWali: ayahBaru,
        kelasId: kelasBaruId,
      });
      setPesanSantri(
        `Santri tersimpan: ${hasil.data.nama} (${hasil.data.kelasNama}).` +
          (hasil.sumberContoh
            ? " (Data contoh — tersimpan sementara, hilang saat halaman dimuat ulang penuh.)"
            : ""),
      );
      setNamaBaru("");
      setAyahBaru("");
      await muatSemua();
    } catch (e: unknown) {
      setPesanSantri(
        e instanceof Error ? e.message : "Gagal menambah santri.",
      );
    } finally {
      setSedangSimpanSantri(false);
    }
  }

  function mulaiUbah(santri: Santri) {
    setEditId(santri.id);
    setNamaEdit(santri.nama);
    setAyahEdit(santri.namaAyahWali);
    setKelasEditId(santri.kelasId);
    setPesanSantri(null);
  }

  async function tanganiSimpanUbah() {
    if (!editId) return;
    setPesanSantri(null);
    setSedangSimpanSantri(true);
    try {
      const hasil = await ubahSantriAdmin(editId, {
        nama: namaEdit,
        namaAyahWali: ayahEdit,
        kelasId: kelasEditId,
      });
      setPesanSantri(`Perubahan tersimpan: ${hasil.data.nama}.`);
      setEditId(null);
      await muatSemua();
    } catch (e: unknown) {
      setPesanSantri(
        e instanceof Error ? e.message : "Gagal mengubah santri.",
      );
    } finally {
      setSedangSimpanSantri(false);
    }
  }

  async function tanganiAturStatus(santri: Santri) {
    setPesanSantri(null);
    try {
      const hasil = await aturStatusAktifSantriAdmin(
        santri.id,
        !santri.statusAktif,
      );
      setPesanSantri(
        hasil.data.statusAktif
          ? `${hasil.data.nama} diaktifkan kembali.`
          : `${hasil.data.nama} dinonaktifkan — tidak tampil lagi di daftar santri modul lain, datanya tetap tersimpan.`,
      );
      if (editId === santri.id) setEditId(null);
      await muatSemua();
    } catch (e: unknown) {
      setPesanSantri(
        e instanceof Error ? e.message : "Gagal mengubah status santri.",
      );
    }
  }

  /* ---------------- Semester: buat ---------------- */

  async function tanganiTambahSemester() {
    setPesanSemester(null);
    setSedangSimpanSemester(true);
    try {
      const hasil = await tambahSemesterAdmin({
        nama: namaSemester,
        jenis: jenisSemester,
        tahunAjaran,
        tanggalMulai,
        tanggalSelesai,
      });
      setPesanSemester(
        `Semester tersimpan: ${hasil.data.nama} (${LABEL_SEMESTER[hasil.data.jenis]}, ${hasil.data.tahunAjaran}).` +
          (hasil.sumberContoh
            ? " (Data contoh — tersimpan sementara, hilang saat halaman dimuat ulang penuh.)"
            : ""),
      );
      setNamaSemester("");
      setTahunAjaran("");
      setTanggalMulai("");
      setTanggalSelesai("");
      await muatSemua();
    } catch (e: unknown) {
      setPesanSemester(
        e instanceof Error ? e.message : "Gagal membuat semester.",
      );
    } finally {
      setSedangSimpanSemester(false);
    }
  }

  /* ---------------- Tautan wali: tambah / lepas ---------------- */

  async function tanganiTambahTautan() {
    setPesanTautan(null);
    setSedangSimpanTautan(true);
    try {
      const hasil = await tambahTautanWali(waliPilih, santriPilih);
      const wali = daftarWali.find((w) => w.id === hasil.data.profileId);
      const santri = santriDariId(hasil.data.santriId);
      setPesanTautan(
        `Tertaut: ${wali?.nama ?? "wali"} sekarang dapat melihat data ${santri?.nama ?? "santri tersebut"}.` +
          (hasil.sumberContoh
            ? " (Data contoh — tersimpan sementara, hilang saat halaman dimuat ulang penuh.)"
            : ""),
      );
      await muatSemua();
    } catch (e: unknown) {
      setPesanTautan(
        e instanceof Error ? e.message : "Gagal menautkan wali.",
      );
    } finally {
      setSedangSimpanTautan(false);
    }
  }

  async function tanganiLepasTautan(profileId: string, santriId: string) {
    setPesanTautan(null);
    try {
      await hapusTautanWali(profileId, santriId);
      const wali = daftarWali.find((w) => w.id === profileId);
      const santri = santriDariId(santriId);
      setPesanTautan(
        `Tautan dilepas: ${wali?.nama ?? "wali"} tidak lagi dapat melihat data ${santri?.nama ?? "santri tersebut"}.`,
      );
      await muatSemua();
    } catch (e: unknown) {
      setPesanTautan(
        e instanceof Error ? e.message : "Gagal melepas tautan wali.",
      );
    }
  }

  return (
    <>
      {sumberContoh && (
        <PenandaTahap teks="DATA CONTOH · FIKSI — env Supabase belum terisi" />
      )}
      <h1 className="judul-halaman">Panel Admin</h1>
      <p className="subjudul">
        Kelola santri, semester, dan tautan akun wali ke anaknya.
      </p>

      {galatMuat && (
        <KartuGalat pesan={galatMuat} onCobaLagi={() => void muatAwal()} />
      )}

      {/* ------------ 1) Kelola santri ------------ */}
      <section className="kartu">
        <h2>Kelola santri</h2>
        <p>
          {semuaSantri.length} santri terdaftar, {jumlahAktif} di antaranya
          aktif. Santri nonaktif tidak tampil di daftar santri modul lain,
          tetapi seluruh datanya tetap tersimpan.
        </p>

        {kelompokSantri.map(({ kelas, santri: isiKelas }) => (
          <div key={kelas.id} style={{ marginTop: 12 }}>
            <h3 style={{ margin: "0 0 8px" }}>
              {kelas.nama} · {isiKelas.length} santri
            </h3>
            {isiKelas.length === 0 ? (
              <p className="catatan-kaki">Belum ada santri di kelas ini.</p>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {isiKelas.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      paddingBottom: 12,
                      borderBottom: "1px solid var(--garis)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <AvatarInisial nama={s.nama} ukuran="kecil" />
                      <div style={{ flex: "1 1 180px" }}>
                        <div style={{ fontWeight: 700 }}>
                          {s.nama}
                          {!s.statusAktif && (
                            <>
                              {" "}
                              <span className="lencana lencana--netral">
                                Nonaktif
                              </span>
                            </>
                          )}
                        </div>
                        <div
                          style={{ color: "var(--teks-redup)", fontSize: 13 }}
                        >
                          Ayah/Wali: {s.namaAyahWali}
                          {s.nis ? ` · NIS ${s.nis}` : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          className="tombol tombol-kecil tombol-sekunder"
                          onClick={() =>
                            editId === s.id ? setEditId(null) : mulaiUbah(s)
                          }
                        >
                          {editId === s.id ? "Tutup" : "Ubah"}
                        </button>
                        <button
                          type="button"
                          className="tombol tombol-kecil tombol-sekunder"
                          onClick={() => tanganiAturStatus(s)}
                        >
                          {s.statusAktif ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      </div>
                    </div>

                    {editId === s.id && (
                      <div
                        className="formulir"
                        style={{ maxWidth: "100%", marginTop: 10 }}
                      >
                        <label>
                          Nama santri
                          <input
                            type="text"
                            className="masukan"
                            value={namaEdit}
                            onChange={(e) => setNamaEdit(e.target.value)}
                          />
                        </label>
                        <label>
                          Nama ayah / wali
                          <input
                            type="text"
                            className="masukan"
                            value={ayahEdit}
                            onChange={(e) => setAyahEdit(e.target.value)}
                          />
                        </label>
                        <label>
                          Kelas
                          <select
                            className="masukan"
                            value={kelasEditId}
                            onChange={(e) => setKelasEditId(e.target.value)}
                          >
                            {daftarKelas.map((k) => (
                              <option key={k.id} value={k.id}>
                                {k.nama} (Tingkat {k.tingkat})
                              </option>
                            ))}
                          </select>
                        </label>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            type="button"
                            className="tombol"
                            onClick={tanganiSimpanUbah}
                            disabled={sedangSimpanSantri}
                          >
                            {sedangSimpanSantri
                              ? "Menyimpan…"
                              : "Simpan perubahan"}
                          </button>
                          <button
                            type="button"
                            className="tombol tombol-sekunder"
                            onClick={() => setEditId(null)}
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <h3 style={{ margin: "18px 0 8px" }}>Tambah santri</h3>
        <div className="formulir" style={{ maxWidth: "100%" }}>
          <label>
            Nama santri
            <input
              type="text"
              className="masukan"
              value={namaBaru}
              onChange={(e) => setNamaBaru(e.target.value)}
              placeholder="Nama lengkap santri"
            />
          </label>
          <label>
            Nama ayah / wali
            <input
              type="text"
              className="masukan"
              value={ayahBaru}
              onChange={(e) => setAyahBaru(e.target.value)}
              placeholder="Nama ayah atau wali santri"
            />
          </label>
          <label>
            Kelas
            <select
              className="masukan"
              value={kelasBaruId}
              onChange={(e) => setKelasBaruId(e.target.value)}
            >
              {daftarKelas.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama} (Tingkat {k.tingkat})
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="tombol"
            onClick={tanganiTambahSantri}
            disabled={sedangSimpanSantri}
          >
            {sedangSimpanSantri ? "Menyimpan…" : "Tambah santri"}
          </button>
        </div>
        {pesanSantri && (
          <p className="catatan-kaki" role="status" style={{ marginTop: 10 }}>
            {pesanSantri}
          </p>
        )}
      </section>

      {/* ------------ 2) Kelola semester ------------ */}
      <section className="kartu">
        <h2>Kelola semester</h2>
        <p>
          Semester dipakai formulir nilai ujian (hifzh &amp; diniyyah) dan
          rekap semesteran.
        </p>
        {daftarSemester.length === 0 ? (
          <p>
            Belum ada semester. Buat semester pertama lewat formulir di
            bawah — selama belum ada, nilai ujian belum bisa diisi.
          </p>
        ) : (
          <div className="daftar-tumpuk">
            {daftarSemester.map((sem) => {
              const status = statusSemester(sem);
              return (
                <div key={sem.id} className="baris-daftar">
                  <LingkaranIkon nama="kalender" warna="biru" />
                  <span className="baris-teks">
                    <span className="baris-judul">{sem.nama}</span>
                    <span className="baris-ket">
                      {LABEL_SEMESTER[sem.jenis]} · Tahun ajaran{" "}
                      {sem.tahunAjaran}
                    </span>
                    <span className="baris-ket">
                      {formatTanggalSingkat(sem.tanggalMulai)} –{" "}
                      {formatTanggalSingkat(sem.tanggalSelesai)}
                    </span>
                  </span>
                  <span
                    className={`lencana ${
                      status === "berjalan"
                        ? "lencana--hadir"
                        : "lencana--netral"
                    }`}
                  >
                    {LABEL_STATUS_SEMESTER[status]}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <p className="catatan-kaki">
          Catatan: tabel semester tidak memiliki kolom penanda aktif.
          Lencana di atas diturunkan dari rentang tanggal semester —
          semester yang &ldquo;sedang berjalan&rdquo; adalah yang
          rentangnya memuat tanggal hari ini.
        </p>

        <h3 style={{ margin: "18px 0 8px" }}>Buat semester baru</h3>
        <div className="formulir" style={{ maxWidth: "100%" }}>
          <label>
            Nama semester
            <input
              type="text"
              className="masukan"
              value={namaSemester}
              onChange={(e) => setNamaSemester(e.target.value)}
              placeholder="Mis. Semester Gasal 1448/1449 H"
            />
          </label>
          <label>
            Jenis
            <select
              className="masukan"
              value={jenisSemester}
              onChange={(e) =>
                setJenisSemester(e.target.value as JenisSemester)
              }
            >
              <option value="gasal">{LABEL_SEMESTER.gasal}</option>
              <option value="genap">{LABEL_SEMESTER.genap}</option>
            </select>
          </label>
          <label>
            Tahun ajaran
            <input
              type="text"
              className="masukan"
              value={tahunAjaran}
              onChange={(e) => setTahunAjaran(e.target.value)}
              placeholder="Mis. 1448/1449 H"
            />
          </label>
          <label>
            Tanggal mulai
            <input
              type="date"
              value={tanggalMulai}
              onChange={(e) => setTanggalMulai(e.target.value)}
            />
          </label>
          <label>
            Tanggal selesai
            <input
              type="date"
              value={tanggalSelesai}
              onChange={(e) => setTanggalSelesai(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="tombol"
            onClick={tanganiTambahSemester}
            disabled={sedangSimpanSemester}
          >
            {sedangSimpanSemester ? "Menyimpan…" : "Buat semester"}
          </button>
        </div>
        {pesanSemester && (
          <p className="catatan-kaki" role="status" style={{ marginTop: 10 }}>
            {pesanSemester}
          </p>
        )}
        <p className="catatan-kaki">
          Satu tahun ajaran hanya boleh punya satu semester gasal dan
          satu semester genap.
        </p>
      </section>

      {/* ------------ 3) Tautan wali ------------ */}
      <section className="kartu">
        <h2>Tautan akun wali</h2>
        <p>
          Wali hanya dapat melihat data santri yang tertaut ke akunnya.
          Akun login wali dibuat terlebih dahulu lewat panel autentikasi
          Supabase (Auth) beserta baris profil berperan wali; setelah itu
          tautkan akunnya ke anaknya di sini.
        </p>

        {daftarWali.length === 0 ? (
          <p>
            Belum ada akun berperan wali di tabel profiles. Buat akunnya
            lewat panel autentikasi Supabase terlebih dahulu.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {daftarWali.map((wali) => {
              const tautanWali = daftarTautan.filter(
                (t) => t.profileId === wali.id,
              );
              return (
                <div
                  key={wali.id}
                  style={{
                    paddingBottom: 12,
                    borderBottom: "1px solid var(--garis)",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <AvatarInisial nama={wali.nama} ukuran="kecil" />
                    <div style={{ fontWeight: 700 }}>{wali.nama}</div>
                  </div>
                  {tautanWali.length === 0 ? (
                    <p className="catatan-kaki" style={{ marginTop: 6 }}>
                      Belum tertaut ke santri mana pun — wali ini belum
                      dapat melihat data santri apa pun.
                    </p>
                  ) : (
                    <div
                      className="grup-chip"
                      style={{ marginTop: 8 }}
                      aria-label={`Santri tertaut untuk ${wali.nama}`}
                    >
                      {tautanWali.map((t) => {
                        const santri = santriDariId(t.santriId);
                        return (
                          <span key={t.santriId} className="chip">
                            {santri
                              ? `${santri.nama} · ${santri.kelasNama}`
                              : t.santriId}
                            <button
                              type="button"
                              aria-label={`Lepas tautan ${wali.nama} dari ${santri?.nama ?? "santri ini"}`}
                              title="Lepas tautan"
                              onClick={() =>
                                tanganiLepasTautan(wali.id, t.santriId)
                              }
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                font: "inherit",
                                padding: "0 0 0 6px",
                                color: "inherit",
                              }}
                            >
                              ✕
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <h3 style={{ margin: "18px 0 8px" }}>Tambah tautan</h3>
        <div className="formulir" style={{ maxWidth: "100%" }}>
          <label>
            Akun wali
            <select
              className="masukan"
              value={waliPilih}
              onChange={(e) => setWaliPilih(e.target.value)}
            >
              {daftarWali.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.nama}
                </option>
              ))}
            </select>
          </label>
          <label>
            Santri (anaknya)
            <select
              className="masukan"
              value={santriPilih}
              onChange={(e) => setSantriPilih(e.target.value)}
            >
              {semuaSantri.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama} · {s.kelasNama}
                  {s.statusAktif ? "" : " (nonaktif)"}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="tombol"
            onClick={tanganiTambahTautan}
            disabled={sedangSimpanTautan || daftarWali.length === 0}
          >
            {sedangSimpanTautan ? "Menyimpan…" : "Tautkan"}
          </button>
        </div>
        {pesanTautan && (
          <p className="catatan-kaki" role="status" style={{ marginTop: 10 }}>
            {pesanTautan}
          </p>
        )}
      </section>
    </>
  );
}
