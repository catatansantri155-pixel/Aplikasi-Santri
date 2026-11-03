"use client";

/**
 * Halaman Olahraga.
 * 1) Buat sesi baru di kepala halaman (audit Fase 3): pilih tanggal
 *    (hari diturunkan otomatis) + isi kegiatan. Jadwal rutin pondok:
 *    AHAD PAGI & KAMIS PAGI — tanggal lain tetap boleh dipilih.
 * 2) Daftar sesi olahraga (satu sesi per tanggal) berkartu: tanggal &
 *    hari, kegiatan, dan ringkasan jumlah Hadir; urut terbaru dulu,
 *    tampil 10 pertama dengan tombol "Muat lebih banyak".
 * 3) Kehadiran per sesi: beri status H/S/I/A per santri dan simpan
 *    sekaligus, meniru pola halaman Kehadiran.
 * Selama env Supabase belum terisi, semua berjalan di atas DATA CONTOH
 * FIKSI dan halaman ini menandainya dengan jelas.
 *
 * Halaman ini hanya mengelola sesi & kehadiran. Belum ada keputusan
 * user apakah olahraga juga dinilai — tidak ada isian nilai di sini.
 *
 * Perbaikan audit Fase 1 (3 Nov 2026): aksi massal diganti "Isi yang
 * kosong sebagai Hadir" (tidak menimpa pilihan yang sudah dibuat;
 * penimpaan total menjadi tindakan sekunder berkonsfirmasi), dan
 * tombol Simpan menyebut cakupan yang benar-benar dikirim — semua
 * status terisi pada sesi ini, termasuk santri yang sedang
 * tersembunyi oleh filter kelas (dijelaskan di keterangan tombol).
 *
 * Mode pantauan admin (keputusan user 4 Nov 2026): untuk ADMIN,
 * formulir "Buat sesi" disembunyikan dan penandaan kehadiran menjadi
 * baca-saja — daftar sesi tetap tampil; membuat sesi & mengisi
 * kehadiran adalah tugas pengajar & musyrif (bolehInput di
 * src/lib/akses.ts).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import PenandaTahap from "@/components/PenandaTahap";
import KartuGalat from "@/components/KartuGalat";
import PenjagaModul from "@/components/PenjagaModul";
import AvatarInisial from "@/components/AvatarInisial";
import { LingkaranIkon } from "@/components/Ikon";
import {
  hitungTertimpa,
  isiKosongSebagaiHadir,
  timpaSemuaJadiHadir,
} from "@/lib/kehadiran-isi";
import { ambilDaftarSantri, type Santri } from "@/lib/data/santri";
import { bolehInput, pesanModePantauan } from "@/lib/akses";
import {
  ambilProfilSaya,
  LABEL_STATUS,
  SINGKATAN_STATUS,
  STATUS_KEHADIRAN,
  type ProfilSaya,
  type StatusKehadiran,
} from "@/lib/data/kehadiran";
import {
  ambilDaftarSesi,
  ambilKehadiranSesi,
  apakahHariOlahragaRutin,
  buatSesiBaru,
  formatTanggalPanjang,
  hariDariTanggal,
  simpanKehadiranSesi,
  type SesiOlahraga,
} from "@/lib/data/olahraga";

function tanggalHariIni(): string {
  const d = new Date();
  const dua = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
}

/**
 * Gerbang peran modul (src/lib/akses.ts): halaman Olahraga hanya
 * dirender untuk staf (admin, kedua pengajar, musyrif); wali menerima
 * pesan penolakan dari PenjagaModul dan isi modul tidak dirender.
 */
export default function HalamanOlahraga() {
  return (
    <PenjagaModul modul="olahraga">
      <IsiHalamanOlahraga />
    </PenjagaModul>
  );
}

function IsiHalamanOlahraga() {
  const [profil, setProfil] = useState<ProfilSaya | null>(null);
  const [semuaSantri, setSemuaSantri] = useState<Santri[]>([]);
  const [daftarSesi, setDaftarSesi] = useState<SesiOlahraga[]>([]);
  const [sumberContoh, setSumberContoh] = useState(false);
  const [galatMuat, setGalatMuat] = useState<string | null>(null);

  // Sesi terpilih & isi kehadirannya
  const [sesiId, setSesiId] = useState<string | null>(null);
  const [pilihan, setPilihan] = useState<Record<string, StatusKehadiran>>({});
  const [filterKelas, setFilterKelas] = useState<string>("semua");
  // Daftar sesi tampil bertahap: 10 pertama, +10 per ketuk (audit Fase 3).
  const [batasSesi, setBatasSesi] = useState(10);
  const [pesanSimpan, setPesanSimpan] = useState<string | null>(null);
  const [sedangMenyimpan, setSedangMenyimpan] = useState(false);

  // Formulir sesi baru
  const [tanggalBaru, setTanggalBaru] = useState<string>(() => tanggalHariIni());
  const [kegiatanBaru, setKegiatanBaru] = useState("");
  const [catatanBaru, setCatatanBaru] = useState("");
  const [pesanBuat, setPesanBuat] = useState<string | null>(null);
  const [sedangMembuat, setSedangMembuat] = useState(false);

  const muatDaftarSesi = useCallback(async (pilihId?: string | null) => {
    const hasil = await ambilDaftarSesi();
    setDaftarSesi(hasil.data);
    setSumberContoh((lama) => lama || hasil.sumberContoh);
    setSesiId((lama) => {
      const target = pilihId !== undefined ? pilihId : lama;
      if (target && hasil.data.some((s) => s.id === target)) return target;
      return hasil.data[0]?.id ?? null;
    });
    return hasil.data;
  }, []);

  /* Muat profil + daftar santri + daftar sesi sekali; juga target
     tombol coba lagi. */
  const muatAwal = useCallback(async () => {
    setGalatMuat(null);
    try {
      const [profilHasil, santriHasil, sesiHasil] = await Promise.all([
        ambilProfilSaya(),
        ambilDaftarSantri(),
        ambilDaftarSesi(),
      ]);
      setProfil(profilHasil.data);
      setSemuaSantri(santriHasil.data);
      setDaftarSesi(sesiHasil.data);
      setSesiId(sesiHasil.data[0]?.id ?? null);
      setSumberContoh(
        profilHasil.sumberContoh ||
          santriHasil.sumberContoh ||
          sesiHasil.sumberContoh,
      );
    } catch (e: unknown) {
      setGalatMuat(
        e instanceof Error ? e.message : "Gagal memuat data olahraga.",
      );
    }
  }, []);

  useEffect(() => {
    void muatAwal();
  }, [muatAwal]);

  /* Kehadiran tersimpan untuk sesi terpilih → isi awal formulir. */
  const muatKehadiran = useCallback(async (id: string) => {
    const hasil = await ambilKehadiranSesi(id);
    const awal: Record<string, StatusKehadiran> = {};
    for (const b of hasil.data) awal[b.santriId] = b.status;
    setPilihan(awal);
  }, []);

  useEffect(() => {
    if (!sesiId) {
      setPilihan({});
      return;
    }
    muatKehadiran(sesiId).catch(() => setPilihan({}));
  }, [sesiId, muatKehadiran]);

  const sesiTerpilih = useMemo(
    () => daftarSesi.find((s) => s.id === sesiId) ?? null,
    [daftarSesi, sesiId],
  );

  /* Daftar sesi selalu urut tanggal terbaru dulu (audit Fase 3),
     apa pun urutan dari lapisan data; yang dirender dibatasi
     batasSesi dan diperluas lewat tombol "Muat lebih banyak". */
  const sesiTerurut = useMemo(
    () =>
      [...daftarSesi].sort((a, b) => b.tanggal.localeCompare(a.tanggal)),
    [daftarSesi],
  );
  const sesiTampil = sesiTerurut.slice(0, batasSesi);

  const santriTampil = useMemo(
    () =>
      filterKelas === "semua"
        ? semuaSantri
        : semuaSantri.filter((s) => s.kelasTingkat === Number(filterKelas)),
    [semuaSantri, filterKelas],
  );

  const jumlahTerisi = Object.keys(pilihan).length;
  const hariBaru = tanggalBaru ? hariDariTanggal(tanggalBaru) : null;

  /* Mode pantauan admin: hanya mode Supabase dengan peran admin
     terkonfirmasi — buat sesi disembunyikan, kehadiran baca-saja.
     Mode contoh (profil contoh admin) tidak diterapkan. */
  const pantauanAdmin =
    !sumberContoh &&
    profil !== null &&
    !bolehInput(profil.peran, "olahraga");

  async function tanganiBuatSesi() {
    setPesanBuat(null);
    if (!tanggalBaru) {
      setPesanBuat("Tanggal sesi wajib dipilih.");
      return;
    }
    if (!kegiatanBaru.trim()) {
      setPesanBuat("Kegiatan sesi wajib diisi.");
      return;
    }
    setSedangMembuat(true);
    try {
      const hasil = await buatSesiBaru({
        tanggal: tanggalBaru,
        kegiatan: kegiatanBaru,
        catatan: catatanBaru,
      });
      setPesanBuat(
        `Sesi tersimpan: ${hasil.data.kegiatan} — ${formatTanggalPanjang(hasil.data.tanggal)}.` +
          (hasil.sumberContoh
            ? " (Data contoh — tersimpan sementara, hilang saat halaman dimuat ulang penuh.)"
            : ""),
      );
      setKegiatanBaru("");
      setCatatanBaru("");
      await muatDaftarSesi(hasil.data.id);
    } catch (e: unknown) {
      setPesanBuat(
        e instanceof Error ? e.message : "Gagal membuat sesi olahraga.",
      );
    } finally {
      setSedangMembuat(false);
    }
  }

  async function tanganiSimpan() {
    setPesanSimpan(null);
    if (!sesiTerpilih) {
      setPesanSimpan("Pilih dulu sesi olahraganya.");
      return;
    }
    const entri = Object.entries(pilihan).map(([santriId, status]) => ({
      santriId,
      status,
    }));
    if (entri.length === 0) {
      setPesanSimpan("Belum ada santri yang diberi status. Ketuk H/S/I/A dulu.");
      return;
    }
    setSedangMenyimpan(true);
    try {
      const hasil = await simpanKehadiranSesi(sesiTerpilih.id, entri);
      setPesanSimpan(
        `Tersimpan: kehadiran ${hasil.data.tersimpan} santri untuk sesi ${formatTanggalPanjang(sesiTerpilih.tanggal)}.` +
          (hasil.sumberContoh
            ? " (Data contoh — tersimpan sementara, hilang saat halaman dimuat ulang penuh.)"
            : ""),
      );
      await muatDaftarSesi(sesiTerpilih.id);
      await muatKehadiran(sesiTerpilih.id);
    } catch (e: unknown) {
      setPesanSimpan(
        e instanceof Error ? e.message : "Gagal menyimpan kehadiran olahraga.",
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
      <h1 className="judul-halaman">Olahraga</h1>
      <p className="subjudul">
        Sesi olahraga Ahad dan Kamis pagi: buat sesi dan isi kehadiran per
        santri.
      </p>

      {galatMuat && (
        <KartuGalat pesan={galatMuat} onCobaLagi={() => void muatAwal()} />
      )}

      {/* ------------ Buat sesi baru ------------ */}
      <section className="kartu">
        <h2>Buat sesi baru</h2>
        {pantauanAdmin ? (
          <p className="catatan-pantauan" role="note">
            {pesanModePantauan("pengajar hifzh, pengajar diniyyah, dan musyrif")}
          </p>
        ) : (
        <div className="formulir" style={{ maxWidth: "100%" }}>
          <label>
            Tanggal sesi
            <input
              type="date"
              value={tanggalBaru}
              onChange={(e) => setTanggalBaru(e.target.value)}
            />
          </label>
          {hariBaru && (
            <p className="catatan-kaki" style={{ margin: 0 }}>
              Hari: <strong>{hariBaru.label}</strong>
              {apakahHariOlahragaRutin(tanggalBaru)
                ? " — sesuai jadwal rutin olahraga (Ahad/Kamis pagi)."
                : " — di luar jadwal rutin (Ahad/Kamis pagi), tetap boleh dibuat."}
            </p>
          )}
          <label>
            Kegiatan
            <input
              type="text"
              className="masukan"
              value={kegiatanBaru}
              onChange={(e) => setKegiatanBaru(e.target.value)}
              placeholder="Mis. Senam pagi & lari keliling lapangan"
            />
          </label>
          <label>
            Catatan (boleh kosong)
            <input
              type="text"
              className="masukan"
              value={catatanBaru}
              onChange={(e) => setCatatanBaru(e.target.value)}
              placeholder="Mis. Lapangan becek, pindah ke aula"
            />
          </label>
          <button
            type="button"
            className="tombol"
            onClick={tanganiBuatSesi}
            disabled={sedangMembuat}
          >
            {sedangMembuat ? "Menyimpan…" : "Buat sesi"}
          </button>
        </div>
        )}
        {pesanBuat && (
          <p className="catatan-kaki" role="status" style={{ marginTop: 10 }}>
            {pesanBuat}
          </p>
        )}
      </section>

      {/* ------------ Daftar sesi ------------ */}
      <section className="kartu">
        <h2>Sesi olahraga</h2>
        {galatMuat ? (
          <p>Data sesi belum bisa ditampilkan.</p>
        ) : daftarSesi.length === 0 ? (
          <p>
            Belum ada sesi olahraga. Buat sesi pertama lewat formulir
            &ldquo;Buat sesi baru&rdquo; di atas.
          </p>
        ) : (
          <div className="daftar-tumpuk">
            {sesiTampil.map((s) => {
              const terpilih = s.id === sesiId;
              return (
                <button
                  key={s.id}
                  type="button"
                  className="baris-daftar"
                  aria-pressed={terpilih}
                  onClick={() => setSesiId(s.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    font: "inherit",
                    cursor: "pointer",
                    background: terpilih ? "var(--hijau-muda)" : undefined,
                    boxShadow: terpilih
                      ? "0 0 0 2px var(--hijau-kop)"
                      : undefined,
                  }}
                >
                  <LingkaranIkon nama="olahraga" warna="emas" />
                  <span className="baris-teks">
                    <span className="baris-judul">{s.kegiatan}</span>
                    <span className="baris-ket">
                      {formatTanggalPanjang(s.tanggal)}
                      {s.pengisiNama ? ` · oleh ${s.pengisiNama}` : ""}
                    </span>
                    {s.catatan && (
                      <span className="baris-ket">{s.catatan}</span>
                    )}
                  </span>
                  <span
                    className="lencana lencana--hadir"
                    title="Jumlah santri hadir dari yang sudah terisi"
                  >
                    {s.jumlahHadir} Hadir
                    {s.jumlahTerisi > 0 ? ` / ${s.jumlahTerisi}` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {sesiTerurut.length > batasSesi && (
          <p style={{ marginTop: 12 }}>
            <button
              type="button"
              className="tombol tombol-sekunder"
              onClick={() => setBatasSesi((b) => b + 10)}
            >
              Muat lebih banyak ({sesiTerurut.length - batasSesi} sesi
              lagi)
            </button>
          </p>
        )}
        <p className="catatan-kaki">
          Ketuk satu sesi untuk mengisi atau melihat kehadirannya di
          bawah. Satu tanggal hanya boleh punya satu sesi.
        </p>
      </section>

      {/* ------------ Kehadiran sesi terpilih ------------ */}
      {sesiTerpilih && (
        <section className="kartu">
          <h2>Kehadiran — {sesiTerpilih.kegiatan}</h2>
          <p>
            {formatTanggalPanjang(sesiTerpilih.tanggal)}. Terisi{" "}
            {jumlahTerisi} dari {semuaSantri.length} santri. Status yang
            sudah tersimpan untuk sesi ini terisi otomatis.
          </p>
          <div className="formulir" style={{ maxWidth: "100%" }}>
            <label>
              Tampilkan kelas
              <select
                className="masukan"
                value={filterKelas}
                onChange={(e) => setFilterKelas(e.target.value)}
              >
                <option value="semua">Semua kelas</option>
                {[1, 2, 3].map((t) => (
                  <option key={t} value={t}>
                    Kelas {t}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            {santriTampil.map((s) => (
              <div
                key={s.id}
                style={{
                  display: "grid",
                  gap: 8,
                  paddingBottom: 12,
                  borderBottom: "1px solid var(--garis)",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  <AvatarInisial nama={s.nama} ukuran="kecil" />
                  <div>
                    <div style={{ fontWeight: 700 }}>{s.nama}</div>
                    <div
                      style={{ color: "var(--teks-redup)", fontSize: 13 }}
                    >
                      {s.kelasNama} · Ayah/Wali: {s.namaAyahWali}
                    </div>
                  </div>
                </div>
                {pantauanAdmin ? (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    {pilihan[s.id] ? (
                      <>
                        <span
                          className={`lencana lencana--besar lencana--${pilihan[s.id]}`}
                        >
                          {LABEL_STATUS[pilihan[s.id]]}
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
                  style={{ display: "flex", gap: 6 }}
                  role="group"
                  aria-label={`Status kehadiran olahraga ${s.nama}`}
                >
                  {STATUS_KEHADIRAN.map((st) => {
                    const aktif = pilihan[s.id] === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        className={`pil-status pil-status--${st}`}
                        aria-pressed={aktif}
                        title={LABEL_STATUS[st]}
                        onClick={() =>
                          setPilihan((lama) => ({ ...lama, [s.id]: st }))
                        }
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
            ))}
            {santriTampil.length === 0 && (
              <p>Belum ada santri pada pilihan kelas ini.</p>
            )}
          </div>

          {!pantauanAdmin && (
          <>
          <div className="bilah-aksi">
            <button
              type="button"
              className="tombol tombol-sekunder"
              onClick={() =>
                setPilihan((lama) =>
                  isiKosongSebagaiHadir(
                    lama,
                    santriTampil.map((s) => s.id),
                  ),
                )
              }
            >
              Isi yang kosong sebagai Hadir
            </button>
            <button
              type="button"
              className="tombol tombol-kecil tombol-sekunder"
              onClick={() => {
                const ids = santriTampil.map((s) => s.id);
                const tertimpa = hitungTertimpa(pilihan, ids);
                if (
                  tertimpa > 0 &&
                  !window.confirm(
                    `${tertimpa} status yang sudah dipilih akan tertimpa menjadi Hadir. Lanjutkan?`,
                  )
                ) {
                  return;
                }
                setPilihan((lama) => timpaSemuaJadiHadir(lama, ids));
              }}
            >
              Timpa semua jadi Hadir
            </button>
            <button
              type="button"
              className="tombol tombol-besar"
              onClick={tanganiSimpan}
              disabled={sedangMenyimpan}
            >
              {sedangMenyimpan
                ? "Menyimpan…"
                : `Simpan kehadiran · ${jumlahTerisi} terisi`}
            </button>
          </div>
          <p className="catatan-kaki" style={{ marginTop: 8 }}>
            {filterKelas === "semua"
              ? "Tombol Simpan mengirim semua status yang terisi pada sesi ini."
              : `Tombol Simpan mengirim semua status yang terisi pada sesi ini (${jumlahTerisi} santri), termasuk santri di luar filter kelas yang sedang tampil — filter hanya membatasi tampilan, bukan cakupan simpan.`}
          </p>
          </>
          )}
          {pesanSimpan && (
            <p className="catatan-kaki" role="status" style={{ marginTop: 10 }}>
              {pesanSimpan}
            </p>
          )}
        </section>
      )}

    </>
  );
}
