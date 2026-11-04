"use client";

/**
 * Isi Halaman Hifzh (komponen klien) — Tahap 2 Jalur D, dipecah
 * menjadi tiga tab pada audit Fase 3: Setoran · Riwayat · Ujian.
 * Tab aktif datang dari query URL (?tab=) yang dibaca page.tsx
 * (komponen server) — pola yang sama dengan halaman Laporan —
 * sehingga tab bertahan saat refresh dan tombol kembali.
 *
 * Isi: (a) form setoran 8 kolom Buku Hafalan dengan pratinjau nilai L/U
 * live dan paraf terkunci; (b) daftar setoran terakhir; (c) tes semester
 * per juz dengan hasil otomatis.
 *
 * Sumber data lewat src/lib/data/hifzh.ts: selama env Supabase belum
 * terisi (Tahap 3), halaman menampilkan DATA CONTOH fiktif dan
 * menandainya dengan jujur lewat penanda di bawah judul.
 *
 * Mode pantauan admin (keputusan user 4 Nov 2026): untuk ADMIN,
 * formulir Setoran dan formulir Ujian (BagianUjian) disembunyikan —
 * yang tampil tab Riwayat dan catatan mode pantauan; input awal
 * adalah tugas pengajar hifzh (bolehInput di src/lib/akses.ts).
 *
 * Koreksi entri (perintah user 4 Nov 2026): setiap setoran di tab
 * Riwayat punya aksi Ubah & Hapus (hapus berkonsfirmasi) untuk
 * penyimak pemilik entri dan Admin Utama — sesuai policy
 * setoran_ubah / setoran_hapus di database.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Ikon } from "@/components/Ikon";
import PenandaTahap from "@/components/PenandaTahap";
import { LABEL_PERAN, PERAN, type Peran } from "@/lib/peran";
import { bolehInput, pesanModePantauan } from "@/lib/akses";
import {
  LABEL_NILAI_SETORAN,
  SEMUA_JENIS_SETORAN,
  nilaiSetoran,
  type JenisSetoran,
} from "@/lib/hifzh";
import {
  NAMA_PENYIMAK_CONTOH,
  ambilDaftarSantri,
  ambilSetoranTerakhir,
  hapusSetoran,
  ubahSetoran,
  type SantriRingkas,
  type SetoranHifzh,
  type SumberData,
} from "@/lib/data/hifzh";
import { ambilProfilLogin } from "@/lib/sesi";
import FormSetoran, { formatHijriah } from "./FormSetoran";
import BagianUjian from "./BagianUjian";
import {
  gayaKisiDua,
  gayaLabel,
  gayaLencanaNilai,
  gayaMasukan,
  gayaPetunjuk,
} from "./gaya";

/**
 * Akun paraf terkunci pada MODE CONTOH (env Supabase kosong). Pada mode
 * Supabase, nama & peran diganti dari profil pengguna yang login
 * (lib/sesi.ts) — paraf tetap terkunci pada akun yang masuk, dan lapisan
 * data menulis penyimak_id dari sesi (auth.uid()), bukan dari tampilan.
 */
const PENGGUNA_MASUK_CONTOH = {
  nama: NAMA_PENYIMAK_CONTOH,
  labelPeran: LABEL_PERAN[PERAN.PENGAJAR_HIFZH],
};

function formatMasehi(tanggalIso: string): string {
  const cocok = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tanggalIso);
  if (!cocok) return tanggalIso;
  const tanggal = new Date(
    Number(cocok[1]),
    Number(cocok[2]) - 1,
    Number(cocok[3]),
    12,
  );
  try {
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(tanggal);
  } catch {
    return tanggalIso;
  }
}

export type TabHifzh = "setoran" | "riwayat" | "ujian";

const DAFTAR_TAB_HIFZH: { kunci: TabHifzh; label: string; href: string }[] = [
  { kunci: "setoran", label: "Setoran", href: "/hifzh" },
  { kunci: "riwayat", label: "Riwayat", href: "/hifzh?tab=riwayat" },
  { kunci: "ujian", label: "Ujian", href: "/hifzh?tab=ujian" },
];

/**
 * Isi halaman Hifzh. Gerbang peran modul (src/lib/akses.ts) dipasang
 * page.tsx lewat PenjagaModul: halaman ini — termasuk form setoran
 * dan bagian ujian — hanya dirender untuk admin & pengajar hifzh.
 */
export default function IsiHalamanHifzh({ tab }: { tab: TabHifzh }) {
  const [daftarSantri, setDaftarSantri] = useState<SantriRingkas[]>([]);
  const [setoran, setSetoran] = useState<SetoranHifzh[]>([]);
  const [cariRiwayat, setCariRiwayat] = useState("");
  const [sumber, setSumber] = useState<SumberData>("contoh");
  const [memuat, setMemuat] = useState(true);
  const [penggunaMasuk, setPenggunaMasuk] = useState(PENGGUNA_MASUK_CONTOH);
  const [peranMasuk, setPeranMasuk] = useState<Peran | null>(null);
  const [idMasuk, setIdMasuk] = useState<string | null>(null);

  // Aksi koreksi setoran tersimpan (ubah & hapus per entri)
  const [editId, setEditId] = useState<string | null>(null);
  const [eTanggal, setETanggal] = useState("");
  const [eJenis, setEJenis] = useState<JenisSetoran>("BR");
  const [eHalaman, setEHalaman] = useState("");
  const [eSurat, setESurat] = useState("");
  const [eAyatDari, setEAyatDari] = useState("");
  const [eAyatSampai, setEAyatSampai] = useState("");
  const [eRg, setERg] = useState("0");
  const [eKk, setEKk] = useState("0");
  const [eKb, setEKb] = useState("0");
  const [eCatatan, setECatatan] = useState("");
  const [eTugas, setETugas] = useState("");
  const [pesanAksi, setPesanAksi] = useState<string | null>(null);
  const [sibukAksi, setSibukAksi] = useState(false);

  useEffect(() => {
    let batal = false;
    Promise.all([ambilDaftarSantri(), ambilSetoranTerakhir(10)])
      .then(async ([hasilSantri, hasilSetoran]) => {
        if (batal) return;
        setDaftarSantri(hasilSantri.data);
        setSetoran(hasilSetoran.data);
        const dariSupabase =
          hasilSantri.sumber === "supabase" &&
          hasilSetoran.sumber === "supabase";
        setSumber(dariSupabase ? "supabase" : "contoh");
        if (dariSupabase) {
          // Paraf penyimak = profil pengguna yang login (mode Supabase).
          const profil = await ambilProfilLogin();
          if (!batal && profil) {
            setPenggunaMasuk({
              nama: profil.nama,
              labelPeran: LABEL_PERAN[profil.peran],
            });
            setPeranMasuk(profil.peran);
            setIdMasuk(profil.id);
          }
        }
      })
      .finally(() => {
        if (!batal) setMemuat(false);
      });
    return () => {
      batal = true;
    };
  }, []);

  /* Mode pantauan admin: hanya pada mode Supabase dan peran admin
     terkonfirmasi dari profil login — formulir setoran & ujian
     disembunyikan (input awal tugas pengajar hifzh). */
  const pantauanAdmin =
    sumber === "supabase" &&
    peranMasuk !== null &&
    !bolehInput(peranMasuk, "hifzh");

  /* Audit visual user 4 Nov 2026: untuk admin, tab awal yang
     bermakna adalah RIWAYAT (pekerjaan admin memantau & mengoreksi,
     bukan mengisi) — tab Setoran yang hanya berisi penjelasan
     dialihkan tampil sebagai Riwayat. */
  const tabEfektif: TabHifzh =
    pantauanAdmin && tab === "setoran" ? "riwayat" : tab;

  /* Aksi ubah/hapus setoran tersimpan: tampil untuk Admin Utama dan
     penyimak pemilik entri (penegakan asli policy setoran_ubah &
     setoran_hapus di database). Mode contoh: semua entri boleh
     dikelola (data fiksi, tersimpan lokal). Baris gema lokal mode
     Supabase (id "lokal-…", belum termuat ulang dari database) tidak
     diberi aksi sampai halaman dimuat ulang. */
  function bolehKelolaSetoran(s: SetoranHifzh): boolean {
    if (sumber === "contoh") return true;
    if (s.id.startsWith("lokal-")) return false;
    if (peranMasuk === PERAN.ADMIN) return true;
    return idMasuk !== null && s.penyimakId === idMasuk;
  }

  function mulaiUbahSetoran(s: SetoranHifzh) {
    setEditId(s.id);
    setETanggal(s.tanggalMasehi);
    setEJenis(s.jenis);
    setEHalaman(String(s.halaman));
    setESurat(s.surat);
    setEAyatDari(String(s.ayatDari));
    setEAyatSampai(String(s.ayatSampai));
    setERg(String(s.rg));
    setEKk(String(s.kk));
    setEKb(String(s.kb));
    setECatatan(s.catatanRincian ?? "");
    setETugas(s.tugasBerikutnya ?? "");
    setPesanAksi(null);
  }

  async function tanganiSimpanUbahSetoran(s: SetoranHifzh) {
    const keAngka = (teks: string) => {
      const n = Number.parseInt(teks, 10);
      return Number.isFinite(n) ? n : 0;
    };
    const halamanN = keAngka(eHalaman);
    const ayatDariN = keAngka(eAyatDari);
    const ayatSampaiN = keAngka(eAyatSampai);
    if (!eTanggal) {
      setPesanAksi("Tanggal setoran wajib diisi.");
      return;
    }
    if (halamanN < 1) {
      setPesanAksi("Halaman harus diisi (angka mulai dari 1).");
      return;
    }
    if (!eSurat.trim()) {
      setPesanAksi("Surat harus diisi.");
      return;
    }
    if (ayatDariN < 1 || ayatSampaiN < ayatDariN) {
      setPesanAksi(
        "Ayat harus benar: ayat dari mulai 1 dan ayat sampai tidak boleh lebih kecil.",
      );
      return;
    }
    const masukan = {
      tanggalMasehi: eTanggal,
      tanggalHijriah: formatHijriah(eTanggal),
      jenis: eJenis,
      halaman: halamanN,
      surat: eSurat.trim(),
      ayatDari: ayatDariN,
      ayatSampai: ayatSampaiN,
      rg: Math.max(0, keAngka(eRg)),
      kk: Math.max(0, keAngka(eKk)),
      kb: Math.max(0, keAngka(eKb)),
      catatanRincian: eCatatan.trim() || null,
      tugasBerikutnya: eTugas.trim() || null,
    };
    setSibukAksi(true);
    setPesanAksi(null);
    try {
      await ubahSetoran(s.id, masukan);
      setSetoran((lama) =>
        lama.map((x) =>
          x.id === s.id
            ? {
                ...x,
                ...masukan,
                nilaiHuruf: nilaiSetoran(
                  masukan.jenis,
                  masukan.rg,
                  masukan.kk,
                  masukan.kb,
                ),
              }
            : x,
        ),
      );
      setEditId(null);
      setPesanAksi(
        `Setoran ${s.santriNama} (${masukan.surat} ayat ${masukan.ayatDari}–${masukan.ayatSampai}) diperbarui.`,
      );
    } catch (e: unknown) {
      setPesanAksi(e instanceof Error ? e.message : "Gagal mengubah setoran.");
    } finally {
      setSibukAksi(false);
    }
  }

  async function tanganiHapusSetoran(s: SetoranHifzh) {
    if (
      !window.confirm(
        `Hapus setoran ${s.santriNama} — ${s.surat} ayat ${s.ayatDari}–${s.ayatSampai} (${s.tanggalMasehi})? Tindakan ini tidak dapat dibatalkan.`,
      )
    ) {
      return;
    }
    setSibukAksi(true);
    setPesanAksi(null);
    try {
      await hapusSetoran(s.id);
      setSetoran((lama) => lama.filter((x) => x.id !== s.id));
      if (editId === s.id) setEditId(null);
      setPesanAksi(
        `Setoran ${s.santriNama} (${s.surat} ayat ${s.ayatDari}–${s.ayatSampai}) dihapus.`,
      );
    } catch (e: unknown) {
      setPesanAksi(e instanceof Error ? e.message : "Gagal menghapus setoran.");
    } finally {
      setSibukAksi(false);
    }
  }

  const kataCari = cariRiwayat.trim().toLocaleLowerCase("id-ID");
  const setoranTampil = setoran.filter((s) =>
    `${s.santriNama} ${s.surat} ${s.jenis}`
      .toLocaleLowerCase("id-ID")
      .includes(kataCari),
  );

  return (
    <>
      {/* Label teknis sumber data DIHAPUS dari tampilan operasional
          (audit visual user 4 Nov 2026) — penanda hanya tampil pada
          mode data contoh, saat isinya memang bukan data asli. */}
      {sumber === "contoh" && (
        <PenandaTahap teks="DATA CONTOH — env Supabase belum terisi" />
      )}
      <h1 className="judul-halaman">Hifzh</h1>
      <p className="subjudul">
        Setoran hafalan dan tes semester per juz, dengan nilai otomatis.
      </p>

      <div role="tablist" aria-label="Bagian hifzh" className="tab-pil">
        {DAFTAR_TAB_HIFZH.map((t) => {
          const aktif = tabEfektif === t.kunci;
          return (
            <Link
              key={t.kunci}
              role="tab"
              id={`tab-hifzh-${t.kunci}`}
              aria-selected={aktif}
              aria-current={aktif ? "page" : undefined}
              aria-controls={`panel-hifzh-${t.kunci}`}
              href={t.href}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`panel-hifzh-${tabEfektif}`}
        aria-labelledby={`tab-hifzh-${tabEfektif}`}
      >
        {tabEfektif === "setoran" && (
          <section className="kartu kartu-form-setoran">
            <h2>Setoran baru</h2>
            {memuat ? (
              <p style={gayaPetunjuk}>Memuat daftar santri…</p>
            ) : pantauanAdmin ? (
              <>
                <p className="catatan-pantauan" role="note">
                  {pesanModePantauan("pengajar hifzh")}
                </p>
                <p style={gayaPetunjuk}>
                  Setoran yang sudah tercatat dapat dipantau di tab Riwayat.
                </p>
              </>
            ) : (
              <FormSetoran
                daftarSantri={daftarSantri}
                namaPenyimak={penggunaMasuk.nama}
                labelPeranPenyimak={penggunaMasuk.labelPeran}
                sumber={sumber}
                onTerkirim={(baru) =>
                  setSetoran((lama) => [baru, ...lama].slice(0, 15))
                }
              />
            )}
          </section>
        )}

        {tabEfektif === "riwayat" && (
          <section className="kartu">
            <h2>Riwayat setoran</h2>
            <div className="riwayat-toolbar">
              <div className="pencarian">
                <span className="pencarian-ikon">
                  <Ikon nama="cari" ukuran={18} />
                </span>
                <input
                  type="search"
                  value={cariRiwayat}
                  onChange={(e) => setCariRiwayat(e.target.value)}
                  placeholder="Cari santri, surat, atau jenis…"
                  aria-label="Cari pada setoran yang dimuat"
                />
              </div>
              <span>
                {setoranTampil.length} dari {setoran.length} setoran terbaru
              </span>
            </div>
            {pesanAksi && (
              <p className="catatan-kaki" role="status">
                {pesanAksi}
              </p>
            )}
            {memuat ? (
              <p style={gayaPetunjuk}>Memuat setoran…</p>
            ) : setoranTampil.length === 0 ? (
              <div className="kartu-kosong">
                <Ikon nama="hifzh" ukuran={28} />
                <strong>
                  {kataCari
                    ? "Setoran tidak ditemukan"
                    : "Belum ada setoran tercatat"}
                </strong>
                <p>
                  {kataCari
                    ? "Coba nama santri atau surat yang lain."
                    : "Setoran baru akan muncul di sini setelah disimpan."}
                </p>
                {kataCari && (
                  <button
                    type="button"
                    className="tombol tombol-sekunder"
                    onClick={() => setCariRiwayat("")}
                  >
                    Hapus pencarian
                  </button>
                )}
              </div>
            ) : (
              <div>
                {setoranTampil.map((s) => (
                  <article
                    key={s.id}
                    style={{
                      display: "flex",
                      gap: 12,
                      padding: "12px 0",
                      borderBottom: "1px solid var(--garis)",
                    }}
                  >
                    {/* Ubin kode jenis prototipe (SetoranRows). */}
                    <span className="ubin-jenis">{s.jenis}</span>
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
                          <strong style={{ fontSize: 14 }}>
                            {s.santriNama || "—"}
                          </strong>
                          <div style={gayaPetunjuk}>
                            {formatMasehi(s.tanggalMasehi)} · {s.tanggalHijriah}
                          </div>
                        </div>
                        <span style={gayaLencanaNilai(s.nilaiHuruf)}>
                          {s.nilaiHuruf} — {LABEL_NILAI_SETORAN[s.nilaiHuruf]}
                        </span>
                      </div>
                      <p style={{ margin: "6px 0 0", fontSize: 14 }}>
                        {s.surat} ayat {s.ayatDari}–{s.ayatSampai} · halaman{" "}
                        {s.halaman} · RG {s.rg} · KK {s.kk} · KB {s.kb}
                      </p>
                      {s.catatanRincian && (
                        <p style={{ ...gayaPetunjuk, marginTop: 2 }}>
                          Rincian kesalahan: {s.catatanRincian}
                        </p>
                      )}
                      <p style={{ ...gayaPetunjuk, marginTop: 2 }}>
                        Penyimak: {s.penyimakNama || "—"}
                        {s.tugasBerikutnya
                          ? ` · Tugas berikutnya: ${s.tugasBerikutnya}`
                          : ""}
                      </p>
                      {bolehKelolaSetoran(s) && editId !== s.id && (
                        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                          <button
                            type="button"
                            className="tombol tombol-kecil tombol-sekunder"
                            onClick={() => mulaiUbahSetoran(s)}
                          >
                            Ubah
                          </button>
                          <button
                            type="button"
                            className="tombol tombol-kecil tombol-sekunder"
                            onClick={() => void tanganiHapusSetoran(s)}
                            disabled={sibukAksi}
                          >
                            Hapus
                          </button>
                        </div>
                      )}
                      {bolehKelolaSetoran(s) && editId === s.id && (
                        <div style={{ marginTop: 10 }}>
                          <div style={gayaKisiDua}>
                            <label style={gayaLabel}>
                              Tanggal
                              <input
                                type="date"
                                value={eTanggal}
                                onChange={(e) => setETanggal(e.target.value)}
                                style={gayaMasukan}
                              />
                              <span style={gayaPetunjuk}>
                                {formatHijriah(eTanggal)} (Hijriah)
                              </span>
                            </label>
                            <label style={gayaLabel}>
                              Jenis hafalan
                              <select
                                value={eJenis}
                                onChange={(e) =>
                                  setEJenis(e.target.value as JenisSetoran)
                                }
                                style={gayaMasukan}
                              >
                                {SEMUA_JENIS_SETORAN.map((j) => (
                                  <option key={j} value={j}>
                                    {j}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <div style={gayaKisiDua}>
                            <label style={gayaLabel}>
                              Halaman
                              <input
                                type="number"
                                min={1}
                                inputMode="numeric"
                                value={eHalaman}
                                onChange={(e) => setEHalaman(e.target.value)}
                                style={gayaMasukan}
                              />
                            </label>
                            <label style={gayaLabel}>
                              Surat
                              <input
                                type="text"
                                value={eSurat}
                                onChange={(e) => setESurat(e.target.value)}
                                style={gayaMasukan}
                              />
                            </label>
                          </div>
                          <div style={gayaKisiDua}>
                            <label style={gayaLabel}>
                              Ayat dari
                              <input
                                type="number"
                                min={1}
                                inputMode="numeric"
                                value={eAyatDari}
                                onChange={(e) => setEAyatDari(e.target.value)}
                                style={gayaMasukan}
                              />
                            </label>
                            <label style={gayaLabel}>
                              Ayat sampai
                              <input
                                type="number"
                                min={1}
                                inputMode="numeric"
                                value={eAyatSampai}
                                onChange={(e) => setEAyatSampai(e.target.value)}
                                style={gayaMasukan}
                              />
                            </label>
                          </div>
                          <div style={gayaKisiDua}>
                            <label style={gayaLabel}>
                              RG
                              <input
                                type="number"
                                min={0}
                                inputMode="numeric"
                                value={eRg}
                                onChange={(e) => setERg(e.target.value)}
                                style={gayaMasukan}
                              />
                            </label>
                            <label style={gayaLabel}>
                              KK
                              <input
                                type="number"
                                min={0}
                                inputMode="numeric"
                                value={eKk}
                                onChange={(e) => setEKk(e.target.value)}
                                style={gayaMasukan}
                              />
                            </label>
                            <label style={gayaLabel}>
                              KB
                              <input
                                type="number"
                                min={0}
                                inputMode="numeric"
                                value={eKb}
                                onChange={(e) => setEKb(e.target.value)}
                                style={gayaMasukan}
                              />
                            </label>
                          </div>
                          <label style={gayaLabel}>
                            Catatan hafalan — rincian kesalahan
                            <textarea
                              value={eCatatan}
                              onChange={(e) => setECatatan(e.target.value)}
                              style={{
                                ...gayaMasukan,
                                minHeight: 56,
                                resize: "vertical",
                              }}
                            />
                          </label>
                          <label style={gayaLabel}>
                            Tugas berikutnya
                            <input
                              type="text"
                              value={eTugas}
                              onChange={(e) => setETugas(e.target.value)}
                              style={gayaMasukan}
                            />
                          </label>
                          <p style={gayaPetunjuk}>
                            Nilai dihitung ulang otomatis dari RG/KK/KB baru
                            saat disimpan.
                          </p>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              type="button"
                              className="tombol tombol-kecil"
                              onClick={() => void tanganiSimpanUbahSetoran(s)}
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
                ))}
              </div>
            )}
          </section>
        )}

        {tabEfektif === "ujian" && (
          <section className="kartu">
            <h2>Tes Semester Hifzhul Qur&apos;an</h2>
            <p>
              Hasil per juz (M sampai G) dihitung otomatis dari kesalahan
              RG/KK/KB.
            </p>
            {memuat ? (
              <p style={gayaPetunjuk}>Memuat daftar santri…</p>
            ) : pantauanAdmin ? (
              <p className="catatan-pantauan" role="note">
                {pesanModePantauan("pengajar hifzh")}
              </p>
            ) : (
              <BagianUjian daftarSantri={daftarSantri} sumber={sumber} />
            )}
          </section>
        )}
      </div>
    </>
  );
}
