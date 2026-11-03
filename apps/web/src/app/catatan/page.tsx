"use client";

/**
 * Halaman Catatan Musyrif — Jalur E, Tahap 2.
 * Form catatan keseharian santri (akhlaq, adab, ibadah shalat, lainnya)
 * + daftar catatan terbaru lintas santri.
 *
 * ATURAN KERAS yang dijaga halaman ini:
 * - Nama pelapor TERKUNCI dari profil pengguna yang sedang masuk
 *   (diambil lewat lib/data/catatan.ts) dan ditampilkan sebagai kolom
 *   baca-saja — tidak ada isian nama bebas, jadi tidak bisa mencatat
 *   atas nama orang lain.
 * - Tombol simpan NONAKTIF bila nama pelapor kosong. Lapisan data juga
 *   menolak menyimpan pada keadaan itu, dan di database kolom
 *   pelapor_nama bersifat NOT NULL + diisi pemicu dari akun login.
 * Selama env Supabase belum terisi, profil pelapor adalah profil contoh
 * fiktif (musyrif contoh) dan halaman ini menandainya dengan jelas.
 */
import {
  useCallback,
  useEffect,
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
import {
  KATEGORI_CATATAN,
  LABEL_KATEGORI,
  ambilCatatanTerbaru,
  ambilProfilPelapor,
  simpanCatatan,
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

const GAYA_TERKUNCI: CSSProperties = {
  minHeight: 48,
  padding: "11px 14px",
  fontSize: 15,
  border: "1.5px dashed #bfd4c6",
  borderRadius: 12,
  background: "var(--hijau-muda)",
  color: "var(--hijau-gelap)",
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
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
  const [pesanSimpan, setPesanSimpan] = useState<string | null>(null);
  const [sedangMenyimpan, setSedangMenyimpan] = useState(false);

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
      if (santriHasil.data.length > 0) setSantriId(santriHasil.data[0].id);
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
  const formulirSiap = pelaporSiap && santriId !== "" && isi.trim().length > 0;

  async function tanganiSimpan() {
    setPesanSimpan(null);
    if (!pelaporSiap) {
      setPesanSimpan(
        "Nama pelapor belum terisi dari akun yang masuk; catatan tidak dapat disimpan.",
      );
      return;
    }
    if (!santriId) {
      setPesanSimpan("Pilih santri dulu.");
      return;
    }
    if (!isi.trim()) {
      setPesanSimpan("Isi catatan wajib diisi.");
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
      setPesanSimpan(
        `Tersimpan: catatan ${LABEL_KATEGORI[hasil.data.kategori]} untuk ${hasil.data.santriNama}, pelapor ${hasil.data.pelaporNama}.` +
          (hasil.sumberContoh
            ? " (Data contoh — tersimpan sementara, hilang saat halaman dimuat ulang penuh.)"
            : ""),
      );
      setIsi("");
      await muatCatatan();
    } catch (e: unknown) {
      setPesanSimpan(
        e instanceof Error ? e.message : "Gagal menyimpan catatan.",
      );
    } finally {
      setSedangMenyimpan(false);
    }
  }

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

      {/* ------------ Form catatan ------------ */}
      <section className="kartu">
        <h2>Catatan baru</h2>
        <div className="formulir" style={{ maxWidth: "100%" }}>
          <label>
            Nama pelapor (terkunci dari akun yang masuk)
            <span style={GAYA_TERKUNCI} aria-readonly="true">
              {profil ? profil.nama : "Memuat profil…"}
            </span>
          </label>
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
              {semuaSantri.length === 0 && (
                <option value="">Belum ada santri</option>
              )}
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
          <button
            type="button"
            className="tombol"
            onClick={tanganiSimpan}
            disabled={sedangMenyimpan || !formulirSiap}
          >
            {sedangMenyimpan ? "Menyimpan…" : "Simpan catatan"}
          </button>
        </div>
        <p className="catatan-kaki" style={{ marginTop: 10 }}>
          Nama pelapor tidak bisa diisi atau diganti di formulir ini —
          selalu nama akun yang sedang masuk, sesuai aturan bahwa kolom
          pelapor wajib terisi sebelum catatan disimpan.
        </p>
        {pesanSimpan && (
          <p className="catatan-kaki" role="status" style={{ marginTop: 6 }}>
            {pesanSimpan}
          </p>
        )}
      </section>

      {/* ------------ Daftar catatan terbaru ------------ */}
      <section className="kartu">
        <h2>Catatan terbaru</h2>
        {daftarCatatan.length === 0 ? (
          <p>Belum ada catatan tercatat.</p>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {daftarCatatan.map((c) => {
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
