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
import { ambilDaftarSantri, type Santri } from "@/lib/data/santri";
import { LABEL_PERAN } from "@/lib/peran";
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
  minHeight: "var(--tinggi-sentuh)",
  padding: "10px 12px",
  fontSize: 15,
  border: "1px solid var(--garis)",
  borderRadius: 10,
  background: "#fff",
};

const GAYA_TERKUNCI: CSSProperties = {
  minHeight: "var(--tinggi-sentuh)",
  padding: "10px 12px",
  fontSize: 15,
  border: "1px dashed var(--garis)",
  borderRadius: 10,
  background: "var(--hijau-muda)",
  color: "var(--hijau-gelap)",
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
};

const GAYA_AREA_TEKS: CSSProperties = {
  padding: "10px 12px",
  fontSize: 15,
  border: "1px solid var(--garis)",
  borderRadius: 10,
  fontFamily: "inherit",
  resize: "vertical",
};

const GAYA_LENCANA: CSSProperties = {
  display: "inline-block",
  padding: "2px 10px",
  borderRadius: 999,
  background: "var(--hijau-muda)",
  color: "var(--hijau-gelap)",
  fontSize: 12,
  fontWeight: 700,
};

function tanggalHariIni(): string {
  const d = new Date();
  const dua = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
}

export default function HalamanCatatan() {
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

  /* Muat profil pelapor + daftar santri + catatan terbaru sekali. */
  useEffect(() => {
    let aktif = true;
    Promise.all([ambilProfilPelapor(), ambilDaftarSantri(), ambilCatatanTerbaru(20)])
      .then(([profilHasil, santriHasil, catatanHasil]) => {
        if (!aktif) return;
        setProfil(profilHasil.data);
        setSemuaSantri(santriHasil.data);
        setDaftarCatatan(catatanHasil.data);
        setSumberContoh(
          profilHasil.sumberContoh ||
            santriHasil.sumberContoh ||
            catatanHasil.sumberContoh,
        );
        if (santriHasil.data.length > 0) setSantriId(santriHasil.data[0].id);
      })
      .catch((e: unknown) => {
        if (!aktif) return;
        setGalatMuat(
          e instanceof Error ? e.message : "Gagal memuat data catatan.",
        );
      });
    return () => {
      aktif = false;
    };
  }, []);

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
        Boleh diisi musyrif serta pengajar hifzh dan diniyyah.
        {profil && (
          <>
            {" "}
            Masuk sebagai: <strong>{profil.nama}</strong> (
            {LABEL_PERAN[profil.peran]}).
          </>
        )}
      </p>

      {galatMuat && (
        <section className="kartu">
          <h2>Data belum bisa dimuat</h2>
          <p>{galatMuat}</p>
        </section>
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
          <label>
            Kategori
            <select
              value={kategori}
              onChange={(e) => setKategori(e.target.value as KategoriCatatan)}
              style={GAYA_PILIH}
            >
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
          <div style={{ display: "grid", gap: 12 }}>
            {daftarCatatan.map((c) => (
              <article
                key={c.id}
                style={{ paddingBottom: 12, borderBottom: "1px solid var(--garis)" }}
              >
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
                  <span style={GAYA_LENCANA}>
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
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
