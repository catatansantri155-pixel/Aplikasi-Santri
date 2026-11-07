"use client";
import { Putaran } from "@/components/Muat";

/**
 * Halaman Kehadiran — Jalur C, Tahap 2.
 * 1) Formulir cepat: pilih tanggal + sesi (hifzh/diniyyah + slot jadwal),
 *    lalu beri status H/S/I/A untuk satu kelas dan simpan sekaligus.
 * 2) Revisi status: HANYA tampil untuk peran admin. Perubahan status
 *    diajukan lewat lapisan data yang memanggil RPC revisi_kehadiran()
 *    (alasan wajib, selalu tercatat di log revisi) — tidak ada jalan
 *    mengubah status secara langsung dari halaman ini.
 * Selama env Supabase belum terisi, semua berjalan di atas DATA CONTOH
 * FIKSI (profil contoh adalah admin, agar bagian revisi bisa diuji) dan
 * halaman ini menandainya dengan jelas.
 *
 * Perbaikan audit Fase 1 (3 Nov 2026):
 * - "Tandai semua Hadir" diganti "Isi yang kosong sebagai Hadir"
 *   (tidak menimpa pilihan yang sudah dibuat); penimpaan total tetap
 *   ada sebagai tindakan sekunder berkonsfirmasi.
 * - Label Simpan menyebut cakupan (jumlah entri + kelas) dan sisa
 *   yang belum diisi.
 * - Ganti tanggal/sesi/jadwal saat ada perubahan belum tersimpan
 *   meminta konfirmasi buang perubahan.
 * - Baris yang statusnya SUDAH tersimpan tampil sebagai lencana
 *   baca-saja untuk non-admin (dan tidak ikut dikirim ulang saat
 *   menyimpan); perubahan status tersimpan hanya lewat revisi admin.
 *
 * Mode pantauan admin (keputusan user 4 Nov 2026): untuk ADMIN,
 * formulir isian massal disembunyikan (baris tampil baca-saja dan
 * tombol aksi massal hilang, catatan mode pantauan tampil) —
 * daftar/ringkasan sesi dan formulir REVISI tetap tampil, karena
 * memantau + mengoreksi memang tugas admin. Gerbangnya bolehInput
 * di src/lib/akses.ts; mode contoh tidak berubah.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import PenandaTahap from "@/components/PenandaTahap";
import KartuGalat from "@/components/KartuGalat";
import PenjagaModul from "@/components/PenjagaModul";
import AvatarInisial from "@/components/AvatarInisial";
import {
  bolehInput,
  bolehRevisiKehadiran,
  pesanModePantauan,
} from "@/lib/akses";
import {
  hitungKosong,
  hitungTertimpa,
  isiKosongSebagaiHadir,
  timpaSemuaJadiHadir,
} from "@/lib/kehadiran-isi";
import { ambilDaftarSantri, type Santri } from "@/lib/data/santri";
import {
  ajukanRevisiKehadiran,
  ambilJadwalSesi,
  ambilKehadiran,
  ambilProfilSaya,
  LABEL_SESI,
  LABEL_STATUS,
  simpanKehadiranMassal,
  SINGKATAN_STATUS,
  STATUS_KEHADIRAN,
  type BarisKehadiran,
  type EntriKehadiranBaru,
  type JadwalSesi,
  type ProfilSaya,
  type SesiKehadiran,
  type StatusKehadiran,
} from "@/lib/data/kehadiran";

function tanggalHariIni(): string {
  const d = new Date();
  const dua = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
}

/** Label ringkas tanggal untuk baris konteks filter di HP. */
function formatTanggalRingkas(tanggalIso: string): string {
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
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(tanggal);
  } catch {
    return tanggalIso;
  }
}

/**
 * Gerbang peran modul (src/lib/akses.ts): halaman Kehadiran hanya
 * dirender untuk admin & kedua pengajar; musyrif/wali menerima pesan
 * penolakan dari PenjagaModul dan form isian tidak dirender sama
 * sekali — termasuk revisi, yang di dalam halaman tetap khusus admin.
 */
export default function HalamanKehadiran() {
  return (
    <PenjagaModul modul="kehadiran">
      <IsiHalamanKehadiran />
    </PenjagaModul>
  );
}

function IsiHalamanKehadiran() {
  const [profil, setProfil] = useState<ProfilSaya | null>(null);
  const [semuaSantri, setSemuaSantri] = useState<Santri[]>([]);
  const [sumberContoh, setSumberContoh] = useState(false);
  const [galatMuat, setGalatMuat] = useState<string | null>(null);

  // Pilihan formulir
  const [tanggal, setTanggal] = useState<string>(() => tanggalHariIni());
  const [sesi, setSesi] = useState<SesiKehadiran>("hifzh");
  /** Filter tanggal/sesi terbuka di HP (audit visual 4 Nov 2026:
      konteks ringkas + tombol Ubah; di desktop selalu tampil). */
  const [daftarJadwal, setDaftarJadwal] = useState<JadwalSesi[]>([]);
  const [jadwalId, setJadwalId] = useState<string | null>(null);
  const [tingkat, setTingkat] = useState<number>(1);

  // Isi formulir
  const [pilihan, setPilihan] = useState<Record<string, StatusKehadiran>>({});
  const [barisTersimpan, setBarisTersimpan] = useState<BarisKehadiran[]>([]);
  /** Ada perubahan pilihan yang belum tersimpan (penjaga konteks). */
  const [kotor, setKotor] = useState(false);
  const [pesanSimpan, setPesanSimpan] = useState<string | null>(null);
  const [sedangMenyimpan, setSedangMenyimpan] = useState(false);

  // Revisi (admin)
  const [revisiId, setRevisiId] = useState<string>("");
  const [revisiStatus, setRevisiStatus] = useState<StatusKehadiran>("hadir");
  const [revisiAlasan, setRevisiAlasan] = useState("");
  const [pesanRevisi, setPesanRevisi] = useState<string | null>(null);
  const [sedangRevisi, setSedangRevisi] = useState(false);

  /* Muat profil + daftar santri sekali; juga target tombol coba lagi. */
  const muatAwal = useCallback(async () => {
    setGalatMuat(null);
    try {
      const [profilHasil, santriHasil] = await Promise.all([
        ambilProfilSaya(),
        ambilDaftarSantri(),
      ]);
      setProfil(profilHasil.data);
      setSemuaSantri(santriHasil.data);
      setSumberContoh(profilHasil.sumberContoh || santriHasil.sumberContoh);
    } catch (e: unknown) {
      setGalatMuat(
        e instanceof Error ? e.message : "Gagal memuat data kehadiran.",
      );
    }
  }, []);

  useEffect(() => {
    void muatAwal();
  }, [muatAwal]);

  /* Jadwal mengikuti jenis sesi terpilih. */
  useEffect(() => {
    let aktif = true;
    ambilJadwalSesi(sesi)
      .then((hasil) => {
        if (!aktif) return;
        setDaftarJadwal(hasil.data);
        setJadwalId(hasil.data[0]?.id ?? null);
      })
      .catch(() => {
        if (aktif) setDaftarJadwal([]);
      });
    return () => {
      aktif = false;
    };
  }, [sesi]);

  /* Baris tersimpan untuk tanggal+sesi+slot terpilih → isi awal formulir
     sekaligus sumber daftar revisi. */
  const muatBarisTersimpan = useCallback(async () => {
    const hasil = await ambilKehadiran(tanggal, sesi, jadwalId ?? undefined);
    setBarisTersimpan(hasil.data);
    const awal: Record<string, StatusKehadiran> = {};
    for (const b of hasil.data) awal[b.santriId] = b.status;
    setPilihan(awal);
    // Isi awal dari basis data bukan perubahan pengguna.
    setKotor(false);
    setRevisiId(hasil.data[0]?.id ?? "");
  }, [tanggal, sesi, jadwalId]);

  useEffect(() => {
    muatBarisTersimpan().catch(() => setBarisTersimpan([]));
  }, [muatBarisTersimpan]);

  const santriKelas = useMemo(
    () => semuaSantri.filter((s) => s.kelasTingkat === tingkat),
    [semuaSantri, tingkat],
  );

  const namaSantri = useCallback(
    (id: string) => semuaSantri.find((s) => s.id === id)?.nama ?? id,
    [semuaSantri],
  );

  const jumlahTerisi = santriKelas.filter((s) => pilihan[s.id]).length;

  // Revisi tetap khusus admin — aturan terpusat di src/lib/akses.ts.
  const adalahAdmin = bolehRevisiKehadiran(profil?.peran);

  /* Mode pantauan admin: admin tidak mengisi kehadiran dari nol
     (bolehInput); formulir massal disembunyikan, daftar sesi dan
     revisi tetap tampil. Mode contoh (profil contoh admin) tidak
     diterapkan — sejalan doktrin peta akses di lib/akses.ts. */
  const pantauanAdmin =
    !sumberContoh && profil !== null && !bolehInput(profil.peran, "kehadiran");

  /** Status yang sudah tersimpan di basis data, per santri. */
  const petaTersimpan = useMemo(
    () => new Map(barisTersimpan.map((b) => [b.santriId, b.status])),
    [barisTersimpan],
  );

  const idKelas = useMemo(() => santriKelas.map((s) => s.id), [santriKelas]);
  /** Id yang boleh diubah dari formulir ini: untuk non-admin, baris
      yang sudah tersimpan dikecualikan dari aksi massal juga. */
  const idBisaDiubah = useMemo(
    () =>
      santriKelas
        .filter((s) => adalahAdmin || !petaTersimpan.has(s.id))
        .map((s) => s.id),
    [santriKelas, adalahAdmin, petaTersimpan],
  );
  const jumlahBelumDiisi = hitungKosong(pilihan, idKelas);
  /** Entri yang benar-benar akan dikirim tombol Simpan: untuk
      non-admin, baris yang sudah tersimpan TIDAK dikirim ulang
      (status tersimpan hanya berubah lewat revisi admin). */
  const jumlahAkanDisimpan = santriKelas.filter(
    (s) => pilihan[s.id] && (adalahAdmin || !petaTersimpan.has(s.id)),
  ).length;

  /**
   * Penjaga konteks (audit Fase 1): mengganti tanggal/sesi/jadwal
   * memuat ulang isi formulir — bila masih ada perubahan belum
   * tersimpan, minta konfirmasi dulu; ditolak = konteks tidak berubah.
   */
  function mintaGantiKonteks(terapkan: () => void) {
    if (
      kotor &&
      !window.confirm(
        "Ada perubahan belum disimpan. Lanjutkan dan buang perubahan?",
      )
    ) {
      return;
    }
    terapkan();
  }

  async function tanganiSimpan() {
    setPesanSimpan(null);
    const entri: EntriKehadiranBaru[] = [];
    for (const s of santriKelas) {
      const status = pilihan[s.id];
      if (!status) continue;
      if (!adalahAdmin && petaTersimpan.has(s.id)) continue;
      entri.push({ santriId: s.id, status });
    }
    if (entri.length === 0) {
      setPesanSimpan(
        jumlahTerisi > 0 && !adalahAdmin
          ? "Semua status yang terisi pada sesi ini sudah tersimpan. Perubahan status tersimpan hanya lewat revisi admin."
          : "Belum ada santri yang diberi status. Ketuk H/S/I/A dulu.",
      );
      return;
    }
    setSedangMenyimpan(true);
    try {
      const hasil = await simpanKehadiranMassal({
        tanggal,
        sesiJenis: sesi,
        jadwalId,
        entri,
      });
      setPesanSimpan(
        `Tersimpan: ${hasil.data.tersimpan} santri untuk sesi ${LABEL_SESI[sesi]} tanggal ${tanggal}.` +
          (hasil.sumberContoh
            ? " (Data contoh — tersimpan sementara, hilang saat halaman dimuat ulang penuh.)"
            : ""),
      );
      await muatBarisTersimpan();
    } catch (e: unknown) {
      setPesanSimpan(
        e instanceof Error ? e.message : "Gagal menyimpan kehadiran.",
      );
    } finally {
      setSedangMenyimpan(false);
    }
  }

  async function tanganiRevisi() {
    setPesanRevisi(null);
    if (!revisiId) {
      setPesanRevisi("Pilih dulu baris kehadiran yang akan direvisi.");
      return;
    }
    if (!revisiAlasan.trim()) {
      setPesanRevisi("Alasan revisi wajib diisi.");
      return;
    }
    setSedangRevisi(true);
    try {
      const hasil = await ajukanRevisiKehadiran({
        kehadiranId: revisiId,
        statusBaru: revisiStatus,
        alasan: revisiAlasan,
      });
      setPesanRevisi(
        `Revisi tercatat: ${namaSantri(barisTersimpan.find((b) => b.id === revisiId)?.santriId ?? "")} dari ${LABEL_STATUS[hasil.data.statusLama]} menjadi ${LABEL_STATUS[hasil.data.statusBaru]}. Alasan tersimpan di log revisi.`,
      );
      setRevisiAlasan("");
      await muatBarisTersimpan();
    } catch (e: unknown) {
      setPesanRevisi(
        e instanceof Error ? e.message : "Revisi kehadiran gagal diajukan.",
      );
    } finally {
      setSedangRevisi(false);
    }
  }

  return (
    <>
      {sumberContoh && (
        <PenandaTahap teks="DATA CONTOH · FIKSI — env Supabase belum terisi" />
      )}
      <h1 className="judul-halaman">Kehadiran</h1>
      <p className="subjudul">
        Isi kehadiran santri untuk sesi hifzh dan diniyyah.
      </p>

      {galatMuat && (
        <KartuGalat pesan={galatMuat} onCobaLagi={() => void muatAwal()} />
      )}

      {/* ------------ Pilihan tanggal & sesi ------------ */}
      {/* Baris saringan prototipe: selalu terlihat, tanpa kartu dan
          tanpa label tampak (aria-label menjaga aksesibilitas). */}
      <div className="filter-baris">
        <input
          type="date"
          className="masukan"
          aria-label="Tanggal"
          value={tanggal}
          onChange={(e) => {
            const nilai = e.target.value;
            mintaGantiKonteks(() => setTanggal(nilai));
          }}
        />
        <div className="segmen" role="group" aria-label="Jenis sesi">
          <button
            type="button"
            aria-pressed={sesi === "hifzh"}
            onClick={() => mintaGantiKonteks(() => setSesi("hifzh"))}
          >
            Hifzh
          </button>
          <button
            type="button"
            aria-pressed={sesi === "diniyyah"}
            onClick={() => mintaGantiKonteks(() => setSesi("diniyyah"))}
          >
            Diniyyah
          </button>
        </div>
        <select
          className="masukan"
          aria-label="Slot jadwal"
          value={jadwalId ?? ""}
          onChange={(e) => {
            const nilai = e.target.value || null;
            mintaGantiKonteks(() => setJadwalId(nilai));
          }}
        >
          {daftarJadwal.length === 0 && (
            <option value="">Belum ada jadwal tersedia</option>
          )}
          {daftarJadwal.map((j) => (
            <option key={j.id} value={j.id}>
              {j.jamLabel}
              {j.mapel ? ` · ${j.mapel}` : ""}
            </option>
          ))}
        </select>
        <div className="segmen segmen--kecil" role="group" aria-label="Kelas">
          {[1, 2, 3].map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tingkat === t}
              onClick={() => setTingkat(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      {daftarJadwal.length === 0 && (
        <p className="catatan-kaki" style={{ marginTop: -6 }}>
          Belum ada jadwal tersedia untuk sesi ini — pencatatan tetap dapat
          dilanjutkan.
        </p>
      )}

      {/* Baris ringkasan prototipe: hitungan per status + tindakan
          massal sebagai tombol hantu. "Timpa semua jadi Hadir"
          TETAP terlihat dengan konfirmasi yang menyebut jumlah
          tertimpa (pengecualian user). */}
      {!pantauanAdmin && (
        <div className="baris-ringkasan">
          {STATUS_KEHADIRAN.map((st) => (
            <span key={st} className={`lencana lencana--${st}`}>
              {SINGKATAN_STATUS[st]}{" "}
              {santriKelas.filter((s) => pilihan[s.id] === st).length}
            </span>
          ))}
          <span className="spaser" />
          <button
            type="button"
            className="tombol tombol-hantu"
            onClick={() => {
              setPilihan((lama) => isiKosongSebagaiHadir(lama, idBisaDiubah));
              setKotor(true);
            }}
          >
            Isi yang kosong sebagai Hadir
          </button>
          <button
            type="button"
            className="tombol tombol-hantu"
            onClick={() => {
              const tertimpa = hitungTertimpa(pilihan, idBisaDiubah);
              if (
                tertimpa > 0 &&
                !window.confirm(
                  `${tertimpa} status yang sudah dipilih akan tertimpa menjadi Hadir. Lanjutkan?`,
                )
              ) {
                return;
              }
              setPilihan((lama) => timpaSemuaJadiHadir(lama, idBisaDiubah));
              setKotor(true);
            }}
          >
            Timpa semua jadi Hadir
          </button>
        </div>
      )}

      {/* ------------ Formulir cepat satu kelas ------------ */}
      <section className="kartu">
        <h2>
          Kelas {tingkat} — {LABEL_SESI[sesi]}
        </h2>
        <p>
          Terisi {jumlahTerisi} dari {santriKelas.length} santri. Status yang
          sudah tersimpan untuk sesi ini terisi otomatis.
        </p>
        {pantauanAdmin && (
          <p className="catatan-pantauan" role="note">
            {pesanModePantauan("pengajar hifzh dan pengajar diniyyah")}
          </p>
        )}
        {!adalahAdmin && barisTersimpan.length > 0 && (
          <p className="catatan-kaki" style={{ marginTop: -6 }}>
            Baris bertanda &ldquo;Tersimpan&rdquo; hanya tampil sebagai lencana.
            Perubahan status tersimpan hanya lewat revisi admin.
          </p>
        )}
        <div style={{ display: "grid", gap: 12 }}>
          {santriKelas.map((s) => {
            // Non-admin: status yang sudah tersimpan di basis data
            // tampil baca-saja (bukan tombol aktif) — audit Fase 1.
            // Admin (mode pantauan): SEMUA baris baca-saja — yang
            // belum terisi pun tidak bisa diisi dari sini.
            const statusTersimpan = petaTersimpan.get(s.id);
            const bacaSaja =
              pantauanAdmin || (!adalahAdmin && statusTersimpan !== undefined);
            return (
              <div key={s.id} className="baris-kehadiran">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <AvatarInisial nama={s.nama} ukuran="kecil" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {s.nama}
                    </div>
                    <div style={{ color: "var(--teks-redup)", fontSize: 12 }}>
                      Ayah/Wali: {s.namaAyahWali}
                    </div>
                  </div>
                </div>
                {bacaSaja ? (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    {statusTersimpan !== undefined ? (
                      <>
                        <span
                          className={`lencana lencana--besar lencana--${statusTersimpan}`}
                        >
                          {LABEL_STATUS[statusTersimpan as StatusKehadiran]}
                        </span>
                        <span
                          style={{ color: "var(--teks-redup)", fontSize: 13 }}
                        >
                          Tersimpan
                        </span>
                      </>
                    ) : (
                      <span
                        style={{ color: "var(--teks-redup)", fontSize: 13 }}
                      >
                        Belum diisi
                      </span>
                    )}
                  </div>
                ) : (
                  <div
                    className="pil-status-grup"
                    role="group"
                    aria-label={`Status kehadiran ${s.nama}`}
                  >
                    {STATUS_KEHADIRAN.map((st) => {
                      const terpilih = pilihan[s.id] === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          className={`pil-status pil-status--${st}`}
                          aria-pressed={terpilih}
                          title={LABEL_STATUS[st]}
                          onClick={() => {
                            setPilihan((lama) => ({ ...lama, [s.id]: st }));
                            setKotor(true);
                          }}
                        >
                          {SINGKATAN_STATUS[st]}
                          <span className="pil-status-label">
                            {LABEL_STATUS[st]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {santriKelas.length === 0 && <p>Belum ada santri pada kelas ini.</p>}
        </div>

        {!pantauanAdmin && (
          <div className="bilah-aksi">
            {/* Bilah simpan tetap prototipe: status isian di kiri,
              tombol simpan di kanan. Tindakan massal pindah ke
              baris ringkasan di atas daftar. */}
            <span className="teks-bilah" role="status">
              {jumlahBelumDiisi > 0
                ? `${jumlahBelumDiisi} belum diisi`
                : "Semua santri kelas ini sudah terisi"}
            </span>
            <button
              type="button"
              className="tombol"
              onClick={tanganiSimpan}
              disabled={sedangMenyimpan || jumlahAkanDisimpan === 0}
            >
              {sedangMenyimpan && <Putaran />} {sedangMenyimpan
                ? "Menyimpan…"
                : `Simpan ${jumlahAkanDisimpan} kehadiran · Kelas ${tingkat}`}
            </button>
          </div>
        )}
        {pesanSimpan && (
          <p className="catatan-kaki" role="status" style={{ marginTop: 10 }}>
            {pesanSimpan}
          </p>
        )}
      </section>

      {/* ------------ Revisi — KHUSUS ADMIN ------------ */}
      {adalahAdmin ? (
        <section className="kartu">
          <h2>Revisi kehadiran (khusus Admin Utama)</h2>
          <p>
            Status yang sudah tersimpan hanya bisa diubah lewat revisi ini.
            Setiap revisi wajib beralasan dan tercatat di log revisi.
          </p>
          <div className="formulir" style={{ maxWidth: "100%" }}>
            <label>
              Baris kehadiran pada sesi terpilih
              <select
                className="masukan"
                value={revisiId}
                onChange={(e) => setRevisiId(e.target.value)}
              >
                {barisTersimpan.length === 0 && (
                  <option value="">
                    Belum ada baris tersimpan pada sesi ini
                  </option>
                )}
                {barisTersimpan.map((b) => (
                  <option key={b.id} value={b.id}>
                    {namaSantri(b.santriId)} — {LABEL_STATUS[b.status]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status baru
              <select
                className="masukan"
                value={revisiStatus}
                onChange={(e) =>
                  setRevisiStatus(e.target.value as StatusKehadiran)
                }
              >
                {STATUS_KEHADIRAN.map((st) => (
                  <option key={st} value={st}>
                    {LABEL_STATUS[st]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Alasan revisi (wajib)
              <textarea
                className="masukan"
                value={revisiAlasan}
                onChange={(e) => setRevisiAlasan(e.target.value)}
                required
                rows={3}
                placeholder="Mis. santri ternyata hadir, terlambat masuk kelas…"
              />
            </label>
            <button
              type="button"
              className="tombol"
              onClick={tanganiRevisi}
              disabled={sedangRevisi || !revisiId || !revisiAlasan.trim()}
            >
              {sedangRevisi && <Putaran />} {sedangRevisi ? "Mengajukan…" : "Ajukan revisi"}
            </button>
          </div>
          {pesanRevisi && (
            <p className="catatan-kaki" role="status" style={{ marginTop: 10 }}>
              {pesanRevisi}
            </p>
          )}
        </section>
      ) : null}
    </>
  );
}
