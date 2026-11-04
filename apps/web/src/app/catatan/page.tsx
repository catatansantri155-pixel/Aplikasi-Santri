"use client";

/**
 * Halaman Catatan Musyrif — Jalur E, Tahap 2.
 * Form catatan keseharian santri (akhlaq, adab, ibadah shalat, lainnya)
 * + daftar catatan terbaru lintas santri.
 *
 * ATURAN KERAS yang dijaga halaman ini:
 * - Nama pelapor TERKUNCI dari profil pengguna yang sedang masuk
 *   (diambil lewat lib/data/catatan.ts) dan ditampilkan sebagai info
 *   kecil di dekat tombol Simpan (audit Fase 3) — tidak ada isian
 *   nama bebas, jadi tidak bisa mencatat atas nama orang lain.
 * - Tombol simpan NONAKTIF bila nama pelapor kosong. Lapisan data juga
 *   menolak menyimpan pada keadaan itu, dan di database kolom
 *   pelapor_nama bersifat NOT NULL + diisi pemicu dari akun login.
 * Selama env Supabase belum terisi, profil pelapor adalah profil contoh
 * fiktif (musyrif contoh) dan halaman ini menandainya dengan jelas.
 *
 * Mode pantauan admin (keputusan user 4 Nov 2026): untuk ADMIN,
 * formulir "Tulis catatan" disembunyikan — "Riwayat catatan" tetap
 * tampil; menulis catatan adalah tugas pengajar & musyrif
 * (bolehInput di src/lib/akses.ts).
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import PenandaTahap from "@/components/PenandaTahap";
import KartuGalat from "@/components/KartuGalat";
import PenjagaModul from "@/components/PenjagaModul";
import {
  LingkaranIkon,
  type NamaIkon,
  type WarnaTint,
} from "@/components/Ikon";
import { ambilDaftarSantri, type Santri } from "@/lib/data/santri";
import { bolehInput, pesanModePantauan } from "@/lib/akses";
import {
  KATEGORI_CATATAN,
  LABEL_KATEGORI,
  ambilCatatanTerbaru,
  ambilProfilPelapor,
  hapusCatatan,
  simpanCatatan,
  ubahCatatan,
  type CatatanMusyrif,
  type KategoriCatatan,
  type ProfilPelapor,
} from "@/lib/data/catatan";

const GAYA_PILIH: CSSProperties = {
  minHeight: 48,
  padding: "11px 14px",
  fontSize: 15,
  border: "1.5px solid var(--garis)",
  borderRadius: 12,
  background: "var(--permukaan)",
};

const GAYA_AREA_TEKS: CSSProperties = {
  padding: "11px 14px",
  fontSize: 15,
  border: "1.5px solid var(--garis)",
  borderRadius: 12,
  fontFamily: "inherit",
  resize: "vertical",
};

/** Ikon & warna tint per kategori catatan (Panduan Desain). */
const IKON_KATEGORI: Record<
  KategoriCatatan,
  { ikon: NamaIkon; warna: WarnaTint }
> = {
  akhlaq: { ikon: "hati", warna: "merah" },
  adab: { ikon: "bintang", warna: "kuning" },
  ibadah_shalat: { ikon: "bulan", warna: "biru" },
  lainnya: { ikon: "lapisan", warna: "hijau" },
};

function tanggalHariIni(): string {
  const d = new Date();
  const dua = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
}

/**
 * Gerbang peran modul (src/lib/akses.ts): halaman Catatan hanya
 * dirender untuk admin, kedua pengajar, dan musyrif; wali menerima
 * pesan penolakan dari PenjagaModul dan form catatan tidak dirender
 * (catatan anaknya tetap bisa ia baca di detail santri, hanya-lihat).
 */
export default function HalamanCatatan() {
  return (
    <PenjagaModul modul="catatan">
      <IsiHalamanCatatan />
    </PenjagaModul>
  );
}

function IsiHalamanCatatan() {
  const [profil, setProfil] = useState<ProfilPelapor | null>(null);
  const [semuaSantri, setSemuaSantri] = useState<Santri[]>([]);
  const [daftarCatatan, setDaftarCatatan] = useState<CatatanMusyrif[]>([]);
  const [sumberContoh, setSumberContoh] = useState(false);
  const [galatMuat, setGalatMuat] = useState<string | null>(null);

  // Isi formulir
  const [santriId, setSantriId] = useState<string>("");
  const [kategori, setKategori] = useState<KategoriCatatan>("akhlaq");
  const [tanggal, setTanggal] = useState<string>(() => tanggalHariIni());
  const [isi, setIsi] = useState("");
  // Pesan hasil simpan dipisah sukses/gagal agar dibedakan visual
  // dengan jelas (audit Fase 3): hijau .pesan-sukses, merah .pesan-galat.
  const [pesanSukses, setPesanSukses] = useState<string | null>(null);
  const [pesanGalatForm, setPesanGalatForm] = useState<string | null>(null);
  const [sedangMenyimpan, setSedangMenyimpan] = useState(false);

  // Aksi koreksi catatan tersimpan (ubah & hapus per entri)
  const [editId, setEditId] = useState<string | null>(null);
  const [editKategori, setEditKategori] = useState<KategoriCatatan>("akhlaq");
  const [editIsi, setEditIsi] = useState("");
  const [pesanAksi, setPesanAksi] = useState<string | null>(null);
  const [sibukAksi, setSibukAksi] = useState(false);

  // Filter riwayat (klien, dari catatan yang sudah termuat)
  const [filterSantriId, setFilterSantriId] = useState<string>("");
  const [filterKategori, setFilterKategori] = useState<"" | KategoriCatatan>(
    "",
  );
  const [filterTanggal, setFilterTanggal] = useState<string>("");

  const muatCatatan = useCallback(async () => {
    const hasil = await ambilCatatanTerbaru(20);
    setDaftarCatatan(hasil.data);
  }, []);

  /* Muat profil pelapor + daftar santri + catatan terbaru sekali;
     juga target tombol coba lagi. */
  const muatAwal = useCallback(async () => {
    setGalatMuat(null);
    try {
      const [profilHasil, santriHasil, catatanHasil] = await Promise.all([
        ambilProfilPelapor(),
        ambilDaftarSantri(),
        ambilCatatanTerbaru(20),
      ]);
      setProfil(profilHasil.data);
      setSemuaSantri(santriHasil.data);
      setDaftarCatatan(catatanHasil.data);
      setSumberContoh(
        profilHasil.sumberContoh ||
          santriHasil.sumberContoh ||
          catatanHasil.sumberContoh,
      );
      // Santri TIDAK dipilih otomatis (audit Fase 1): pilihan awal
      // kosong agar catatan tidak berisiko masuk ke anak yang salah;
      // pengguna wajib memilih secara sadar.
    } catch (e: unknown) {
      setGalatMuat(
        e instanceof Error ? e.message : "Gagal memuat data catatan.",
      );
    }
  }, []);

  useEffect(() => {
    void muatAwal();
  }, [muatAwal]);

  /** Pelapor siap bila profil termuat DAN namanya tidak kosong. */
  const pelaporSiap = profil !== null && profil.nama.trim().length > 0;

  /* Mode pantauan admin: hanya mode Supabase dengan peran admin
     terkonfirmasi dari profil pelapor — formulir tulis disembunyikan,
     riwayat tetap tampil. Profil contoh adalah musyrif, jadi mode
     contoh tidak tersentuh. */
  const pantauanAdmin =
    !sumberContoh &&
    profil !== null &&
    !bolehInput(profil.peran, "catatan");
  const formulirSiap = pelaporSiap && santriId !== "" && isi.trim().length > 0;
  /** Identitas santri terpilih, ditampilkan dekat tombol Simpan. */
  const santriTerpilih = semuaSantri.find((s) => s.id === santriId) ?? null;

  async function tanganiSimpan() {
    setPesanSukses(null);
    setPesanGalatForm(null);
    if (!pelaporSiap) {
      setPesanGalatForm(
        "Nama pelapor belum terisi dari akun yang masuk; catatan tidak dapat disimpan.",
      );
      return;
    }
    if (!santriId) {
      setPesanGalatForm("Pilih santri dulu.");
      return;
    }
    if (!isi.trim()) {
      setPesanGalatForm("Isi catatan wajib diisi.");
      return;
    }
    setSedangMenyimpan(true);
    try {
      const hasil = await simpanCatatan({
        santriId,
        kategori,
        isi,
        tanggal,
      });
      setPesanSukses(
        `Tersimpan: catatan ${LABEL_KATEGORI[hasil.data.kategori]} untuk ${hasil.data.santriNama}, pelapor ${hasil.data.pelaporNama}.` +
          (hasil.sumberContoh
            ? " (Data contoh — tersimpan sementara, hilang saat halaman dimuat ulang penuh.)"
            : ""),
      );
      setIsi("");
      await muatCatatan();
    } catch (e: unknown) {
      setPesanGalatForm(
        e instanceof Error ? e.message : "Gagal menyimpan catatan.",
      );
    } finally {
      setSedangMenyimpan(false);
    }
  }

  /* Aksi ubah/hapus catatan tersimpan: tampil untuk Admin Utama dan
     pelapor pemilik catatan (penegakan asli policy catatan_ubah &
     catatan_hapus di database). Mode contoh: semua catatan boleh
     dikelola (data fiksi). */
  function bolehKelolaCatatan(c: CatatanMusyrif): boolean {
    if (sumberContoh) return true;
    if (!profil) return false;
    return profil.peran === "admin" || c.pelaporId === profil.id;
  }

  function mulaiUbahCatatan(c: CatatanMusyrif) {
    setEditId(c.id);
    setEditKategori(c.kategori);
    setEditIsi(c.isi);
    setPesanAksi(null);
  }

  async function tanganiSimpanUbahCatatan(c: CatatanMusyrif) {
    if (!editIsi.trim()) {
      setPesanAksi("Isi catatan wajib diisi.");
      return;
    }
    setSibukAksi(true);
    setPesanAksi(null);
    try {
      await ubahCatatan(c.id, { kategori: editKategori, isi: editIsi });
      setEditId(null);
      setPesanAksi(
        `Catatan ${LABEL_KATEGORI[editKategori]} untuk ${c.santriNama} diperbarui.`,
      );
      await muatCatatan();
    } catch (e: unknown) {
      setPesanAksi(
        e instanceof Error ? e.message : "Gagal mengubah catatan.",
      );
    } finally {
      setSibukAksi(false);
    }
  }

  async function tanganiHapusCatatan(c: CatatanMusyrif) {
    if (
      !window.confirm(
        `Hapus catatan ${LABEL_KATEGORI[c.kategori]} untuk ${c.santriNama} (${c.tanggal})? Tindakan ini tidak dapat dibatalkan.`,
      )
    ) {
      return;
    }
    setSibukAksi(true);
    setPesanAksi(null);
    try {
      await hapusCatatan(c.id);
      if (editId === c.id) setEditId(null);
      setPesanAksi(
        `Catatan ${LABEL_KATEGORI[c.kategori]} untuk ${c.santriNama} dihapus.`,
      );
      await muatCatatan();
    } catch (e: unknown) {
      setPesanAksi(
        e instanceof Error ? e.message : "Gagal menghapus catatan.",
      );
    } finally {
      setSibukAksi(false);
    }
  }

  /* Riwayat tersaring: filter santri/kategori/tanggal diterapkan di
     klien atas catatan yang sudah termuat (20 terbaru). */
  const catatanTampil = useMemo(
    () =>
      daftarCatatan.filter(
        (c) =>
          (filterSantriId === "" || c.santriId === filterSantriId) &&
          (filterKategori === "" || c.kategori === filterKategori) &&
          (filterTanggal === "" || c.tanggal === filterTanggal),
      ),
    [daftarCatatan, filterSantriId, filterKategori, filterTanggal],
  );
  const filterAktif =
    filterSantriId !== "" || filterKategori !== "" || filterTanggal !== "";

  return (
    <>
      {sumberContoh && (
        <PenandaTahap teks="DATA CONTOH · FIKSI — env Supabase belum terisi" />
      )}
      <h1 className="judul-halaman">Catatan Musyrif</h1>
      <p className="subjudul">
        Catatan keseharian santri: akhlaq, adab, ibadah shalat, dan lainnya.
      </p>

      {galatMuat && (
        <KartuGalat pesan={galatMuat} onCobaLagi={() => void muatAwal()} />
      )}

      {/* ------------ Tulis catatan ------------ */}
      <section className="kartu">
        <h2>Tulis catatan</h2>
        {pantauanAdmin ? (
          <p className="catatan-pantauan" role="note">
            {pesanModePantauan("pengajar hifzh, pengajar diniyyah, dan musyrif")}
          </p>
        ) : (
        <div className="formulir" style={{ maxWidth: "100%" }}>
          {!pelaporSiap && profil !== null && (
            <p className="catatan-kaki" role="alert">
              Nama pelapor kosong pada akun yang masuk, jadi penyimpanan
              dinonaktifkan sampai profil dilengkapi.
            </p>
          )}
          <label>
            Santri
            <select
              value={santriId}
              onChange={(e) => setSantriId(e.target.value)}
              style={GAYA_PILIH}
            >
              <option value="">
                {semuaSantri.length === 0
                  ? "Belum ada santri"
                  : "Pilih santri…"}
              </option>
              {semuaSantri.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama} — Kelas {s.kelasTingkat}
                </option>
              ))}
            </select>
          </label>
          <div>
            <span
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Kategori
            </span>
            <div className="grup-chip" role="group" aria-label="Kategori catatan">
              {KATEGORI_CATATAN.map((k) => (
                <button
                  key={k}
                  type="button"
                  className="chip"
                  aria-pressed={kategori === k}
                  onClick={() => setKategori(k)}
                >
                  {LABEL_KATEGORI[k]}
                </button>
              ))}
            </div>
          </div>
          <label>
            Tanggal
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          </label>
          <label>
            Isi catatan
            <textarea
              value={isi}
              onChange={(e) => setIsi(e.target.value)}
              required
              rows={4}
              placeholder="Tulis catatan keseharian santri…"
              style={GAYA_AREA_TEKS}
            />
          </label>
          <p className="catatan-kaki" style={{ margin: 0 }}>
            {santriTerpilih ? (
              <>
                Santri terpilih:{" "}
                <strong>
                  {santriTerpilih.nama} — Kelas {santriTerpilih.kelasTingkat}
                </strong>
              </>
            ) : (
              "Pilih santri terlebih dahulu — catatan tidak akan tersimpan sebelum santri dipilih."
            )}
          </p>
          <p className="catatan-kaki" style={{ margin: 0 }}>
            Pelapor:{" "}
            <strong>{profil ? profil.nama : "Memuat profil…"}</strong> —
            tercatat otomatis dari akun yang masuk dan tidak dapat
            diganti di formulir ini.
          </p>
          <button
            type="button"
            className="tombol"
            onClick={tanganiSimpan}
            disabled={sedangMenyimpan || !formulirSiap}
          >
            {sedangMenyimpan ? "Menyimpan…" : "Simpan catatan"}
          </button>
        </div>
        )}
        {pesanGalatForm && (
          <p className="pesan-galat" role="alert" style={{ marginTop: 10 }}>
            {pesanGalatForm}
          </p>
        )}
        {pesanSukses && (
          <p className="pesan-sukses" role="status" style={{ marginTop: 10 }}>
            {pesanSukses}
          </p>
        )}
      </section>

      {/* ------------ Riwayat catatan ------------ */}
      <section className="kartu">
        <h2>Riwayat catatan</h2>
        {pesanAksi && (
          <p className="catatan-kaki" role="status">
            {pesanAksi}
          </p>
        )}
        <div className="formulir" style={{ maxWidth: "100%", marginBottom: 14 }}>
          <label>
            Santri
            <select
              value={filterSantriId}
              onChange={(e) => setFilterSantriId(e.target.value)}
              style={GAYA_PILIH}
            >
              <option value="">Semua santri</option>
              {semuaSantri.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama} — Kelas {s.kelasTingkat}
                </option>
              ))}
            </select>
          </label>
          <label>
            Kategori
            <select
              value={filterKategori}
              onChange={(e) =>
                setFilterKategori(e.target.value as "" | KategoriCatatan)
              }
              style={GAYA_PILIH}
            >
              <option value="">Semua kategori</option>
              {KATEGORI_CATATAN.map((k) => (
                <option key={k} value={k}>
                  {LABEL_KATEGORI[k]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tanggal
            <input
              type="date"
              value={filterTanggal}
              onChange={(e) => setFilterTanggal(e.target.value)}
            />
          </label>
        </div>
        {daftarCatatan.length > 0 && (
          <p className="catatan-kaki" style={{ marginTop: 0 }}>
            Menampilkan {catatanTampil.length} dari {daftarCatatan.length}{" "}
            catatan terbaru.
            {filterAktif && (
              <>
                {" "}
                <button
                  type="button"
                  className="tombol tombol-kecil tombol-sekunder"
                  onClick={() => {
                    setFilterSantriId("");
                    setFilterKategori("");
                    setFilterTanggal("");
                  }}
                >
                  Kosongkan filter
                </button>
              </>
            )}
          </p>
        )}
        {daftarCatatan.length === 0 ? (
          <p>Belum ada catatan tercatat.</p>
        ) : catatanTampil.length === 0 ? (
          <p>Tidak ada catatan yang cocok dengan filter di atas.</p>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {catatanTampil.map((c) => {
              const ikonKat = IKON_KATEGORI[c.kategori];
              return (
                <article
                  key={c.id}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    paddingBottom: 14,
                    borderBottom: "1px solid var(--garis)",
                  }}
                >
                  <LingkaranIkon nama={ikonKat.ikon} warna={ikonKat.warna} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <strong>{c.santriNama}</strong>
                        <div
                          style={{ color: "var(--teks-redup)", fontSize: 13 }}
                        >
                          {c.tanggal}
                        </div>
                      </div>
                      <span className="lencana lencana--netral">
                        {LABEL_KATEGORI[c.kategori]}
                      </span>
                    </div>
                    <p style={{ margin: "6px 0 0", fontSize: 14 }}>{c.isi}</p>
                    <p
                      style={{
                        margin: "4px 0 0",
                        fontSize: 13,
                        color: "var(--teks-redup)",
                      }}
                    >
                      Pelapor: <strong>{c.pelaporNama}</strong>
                    </p>
                    {bolehKelolaCatatan(c) && editId !== c.id && (
                      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                        <button
                          type="button"
                          className="tombol tombol-kecil tombol-sekunder"
                          onClick={() => mulaiUbahCatatan(c)}
                        >
                          Ubah
                        </button>
                        <button
                          type="button"
                          className="tombol tombol-kecil tombol-sekunder"
                          onClick={() => void tanganiHapusCatatan(c)}
                          disabled={sibukAksi}
                        >
                          Hapus
                        </button>
                      </div>
                    )}
                    {bolehKelolaCatatan(c) && editId === c.id && (
                      <div style={{ marginTop: 10 }}>
                        <div
                          className="grup-chip"
                          role="group"
                          aria-label="Kategori catatan"
                        >
                          {KATEGORI_CATATAN.map((k) => (
                            <button
                              key={k}
                              type="button"
                              className="chip"
                              aria-pressed={editKategori === k}
                              onClick={() => setEditKategori(k)}
                            >
                              {LABEL_KATEGORI[k]}
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={editIsi}
                          onChange={(e) => setEditIsi(e.target.value)}
                          rows={4}
                          style={{ ...GAYA_AREA_TEKS, width: "100%", marginTop: 10 }}
                          aria-label="Isi catatan"
                        />
                        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                          <button
                            type="button"
                            className="tombol tombol-kecil"
                            onClick={() => void tanganiSimpanUbahCatatan(c)}
                            disabled={sibukAksi}
                          >
                            {sibukAksi ? "Menyimpan…" : "Simpan perubahan"}
                          </button>
                          <button
                            type="button"
                            className="tombol tombol-kecil tombol-sekunder"
                            onClick={() => setEditId(null)}
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
