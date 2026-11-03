"use client";

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
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import PenandaTahap from "@/components/PenandaTahap";
import PenjagaModul from "@/components/PenjagaModul";
import { bolehRevisiKehadiran } from "@/lib/akses";
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

const GAYA_STATUS: Record<StatusKehadiran, { latar: string; teks: string }> = {
  hadir: { latar: "#e6f2ec", teks: "#0b4d36" },
  sakit: { latar: "#fff3d6", teks: "#7a5b00" },
  izin: { latar: "#e3ecfb", teks: "#1d4e8a" },
  alpa: { latar: "#fbe7e7", teks: "#8a1f1f" },
};

function tanggalHariIni(): string {
  const d = new Date();
  const dua = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
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
  const [daftarJadwal, setDaftarJadwal] = useState<JadwalSesi[]>([]);
  const [jadwalId, setJadwalId] = useState<string | null>(null);
  const [tingkat, setTingkat] = useState<number>(1);

  // Isi formulir
  const [pilihan, setPilihan] = useState<Record<string, StatusKehadiran>>({});
  const [barisTersimpan, setBarisTersimpan] = useState<BarisKehadiran[]>([]);
  const [pesanSimpan, setPesanSimpan] = useState<string | null>(null);
  const [sedangMenyimpan, setSedangMenyimpan] = useState(false);

  // Revisi (admin)
  const [revisiId, setRevisiId] = useState<string>("");
  const [revisiStatus, setRevisiStatus] = useState<StatusKehadiran>("hadir");
  const [revisiAlasan, setRevisiAlasan] = useState("");
  const [pesanRevisi, setPesanRevisi] = useState<string | null>(null);
  const [sedangRevisi, setSedangRevisi] = useState(false);

  /* Muat profil + daftar santri sekali. */
  useEffect(() => {
    let aktif = true;
    Promise.all([ambilProfilSaya(), ambilDaftarSantri()])
      .then(([profilHasil, santriHasil]) => {
        if (!aktif) return;
        setProfil(profilHasil.data);
        setSemuaSantri(santriHasil.data);
        setSumberContoh(profilHasil.sumberContoh || santriHasil.sumberContoh);
      })
      .catch((e: unknown) => {
        if (!aktif) return;
        setGalatMuat(
          e instanceof Error ? e.message : "Gagal memuat data kehadiran.",
        );
      });
    return () => {
      aktif = false;
    };
  }, []);

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

  async function tanganiSimpan() {
    setPesanSimpan(null);
    const entri: EntriKehadiranBaru[] = [];
    for (const s of santriKelas) {
      const status = pilihan[s.id];
      if (status) entri.push({ santriId: s.id, status });
    }
    if (entri.length === 0) {
      setPesanSimpan("Belum ada santri yang diberi status. Ketuk H/S/I/A dulu.");
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

  // Revisi tetap khusus admin — aturan terpusat di src/lib/akses.ts.
  const adalahAdmin = bolehRevisiKehadiran(profil?.peran);

  return (
    <>
      {sumberContoh && (
        <PenandaTahap teks="DATA CONTOH · FIKSI — env Supabase belum terisi" />
      )}
      <h1 className="judul-halaman">Kehadiran</h1>
      <p className="subjudul">
        Isi kehadiran per sesi hifzh dan diniyyah: Hadir, Sakit, Izin, Alpa —
        satu ketukan per santri.
        {profil && (
          <>
            {" "}
            Masuk sebagai contoh: <strong>{profil.nama}</strong> (
            {profil.peran === "admin" ? "Admin Utama" : profil.peran}).
          </>
        )}
      </p>

      {galatMuat && (
        <section className="kartu">
          <h2>Data belum bisa dimuat</h2>
          <p>{galatMuat}</p>
        </section>
      )}

      {/* ------------ Pilihan tanggal & sesi ------------ */}
      <section className="kartu">
        <h2>Tanggal & sesi</h2>
        <div className="formulir" style={{ maxWidth: "100%" }}>
          <label>
            Tanggal
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          </label>
          <label>
            Jenis sesi
            <select
              value={sesi}
              onChange={(e) => setSesi(e.target.value as SesiKehadiran)}
              style={{
                minHeight: "var(--tinggi-sentuh)",
                padding: "10px 12px",
                fontSize: 15,
                border: "1px solid var(--garis)",
                borderRadius: 10,
              }}
            >
              <option value="hifzh">Hifzh</option>
              <option value="diniyyah">Diniyyah</option>
            </select>
          </label>
          <label>
            Slot jadwal
            <select
              value={jadwalId ?? ""}
              onChange={(e) => setJadwalId(e.target.value || null)}
              style={{
                minHeight: "var(--tinggi-sentuh)",
                padding: "10px 12px",
                fontSize: 15,
                border: "1px solid var(--garis)",
                borderRadius: 10,
              }}
            >
              {daftarJadwal.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.jamLabel}
                  {j.mapel ? ` · ${j.mapel}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            Kelas
            <select
              value={tingkat}
              onChange={(e) => setTingkat(Number(e.target.value))}
              style={{
                minHeight: "var(--tinggi-sentuh)",
                padding: "10px 12px",
                fontSize: 15,
                border: "1px solid var(--garis)",
                borderRadius: 10,
              }}
            >
              {[1, 2, 3].map((t) => (
                <option key={t} value={t}>
                  Kelas {t}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* ------------ Formulir cepat satu kelas ------------ */}
      <section className="kartu">
        <h2>
          Kelas {tingkat} — {LABEL_SESI[sesi]}
        </h2>
        <p>
          Terisi {jumlahTerisi} dari {santriKelas.length} santri. Status yang
          sudah tersimpan untuk sesi ini terisi otomatis.
        </p>
        <div style={{ display: "grid", gap: 12 }}>
          {santriKelas.map((s) => (
            <div
              key={s.id}
              style={{
                display: "grid",
                gap: 8,
                paddingBottom: 12,
                borderBottom: "1px solid var(--garis)",
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{s.nama}</div>
                <div style={{ color: "var(--teks-redup)", fontSize: 13 }}>
                  Ayah/Wali: {s.namaAyahWali}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }} role="group" aria-label={`Status kehadiran ${s.nama}`}>
                {STATUS_KEHADIRAN.map((st) => {
                  const terpilih = pilihan[s.id] === st;
                  const gaya = GAYA_STATUS[st];
                  return (
                    <button
                      key={st}
                      type="button"
                      aria-pressed={terpilih}
                      title={LABEL_STATUS[st]}
                      onClick={() =>
                        setPilihan((lama) => ({ ...lama, [s.id]: st }))
                      }
                      style={{
                        flex: 1,
                        minHeight: "var(--tinggi-sentuh)",
                        borderRadius: 10,
                        border: terpilih
                          ? `2px solid ${gaya.teks}`
                          : "1px solid var(--garis)",
                        background: terpilih ? gaya.latar : "#fff",
                        color: gaya.teks,
                        fontWeight: 700,
                        fontSize: 15,
                        cursor: "pointer",
                      }}
                    >
                      {SINGKATAN_STATUS[st]}
                      <span style={{ display: "block", fontSize: 11, fontWeight: 600 }}>
                        {LABEL_STATUS[st]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {santriKelas.length === 0 && (
            <p>Belum ada santri pada kelas ini.</p>
          )}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
          <button
            type="button"
            className="tombol tombol-kecil"
            onClick={() =>
              setPilihan((lama) => {
                const baru = { ...lama };
                for (const s of santriKelas) baru[s.id] = "hadir";
                return baru;
              })
            }
          >
            Tandai semua Hadir
          </button>
          <button
            type="button"
            className="tombol"
            onClick={tanganiSimpan}
            disabled={sedangMenyimpan}
          >
            {sedangMenyimpan ? "Menyimpan…" : "Simpan kehadiran"}
          </button>
        </div>
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
                value={revisiId}
                onChange={(e) => setRevisiId(e.target.value)}
                style={{
                  minHeight: "var(--tinggi-sentuh)",
                  padding: "10px 12px",
                  fontSize: 15,
                  border: "1px solid var(--garis)",
                  borderRadius: 10,
                }}
              >
                {barisTersimpan.length === 0 && (
                  <option value="">Belum ada baris tersimpan pada sesi ini</option>
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
                value={revisiStatus}
                onChange={(e) => setRevisiStatus(e.target.value as StatusKehadiran)}
                style={{
                  minHeight: "var(--tinggi-sentuh)",
                  padding: "10px 12px",
                  fontSize: 15,
                  border: "1px solid var(--garis)",
                  borderRadius: 10,
                }}
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
                value={revisiAlasan}
                onChange={(e) => setRevisiAlasan(e.target.value)}
                required
                rows={3}
                placeholder="Mis. santri ternyata hadir, terlambat masuk kelas…"
                style={{
                  padding: "10px 12px",
                  fontSize: 15,
                  border: "1px solid var(--garis)",
                  borderRadius: 10,
                  fontFamily: "inherit",
                }}
              />
            </label>
            <button
              type="button"
              className="tombol"
              onClick={tanganiRevisi}
              disabled={sedangRevisi || !revisiId || !revisiAlasan.trim()}
            >
              {sedangRevisi ? "Mengajukan…" : "Ajukan revisi"}
            </button>
          </div>
          {pesanRevisi && (
            <p className="catatan-kaki" role="status" style={{ marginTop: 10 }}>
              {pesanRevisi}
            </p>
          )}
        </section>
      ) : (
        profil && (
          <p className="catatan-kaki">
            Bagian revisi kehadiran hanya tampil untuk Admin Utama; peran
            Anda saat ini bukan admin.
          </p>
        )
      )}
    </>
  );
}
