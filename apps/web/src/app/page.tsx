"use client";

/**
 * Beranda — dua mode:
 *
 * MODE CONTOH (env Supabase kosong): tampilan scaffold peran (Jalur B)
 * + "Tampilan Wali (contoh)" (Jalur F): pandangan SATU wali atas SATU
 * anaknya, hanya-lihat, dari data contoh. Pembatas aslinya adalah RLS
 * database (wali hanya lolos membaca santri yang tertaut kepadanya di
 * tabel wali_santri) — bukan sekadar tampilan yang disembunyikan.
 *
 * MODE SUPABASE (login asli tersambung): sapaan sesuai profil pengguna
 * yang login (nama + peran dari tabel profiles) dan tautan modul yang
 * disaring per peran dari peta terpusat src/lib/akses.ts (kartu modul
 * yang tidak berhak dibuka peran itu tidak ditampilkan), tanpa
 * penanda contoh dan tanpa mengarang data apa pun.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import PenandaTahap from "@/components/PenandaTahap";
import {
  Ikon,
  LingkaranIkon,
  type NamaIkon,
  type WarnaTint,
} from "@/components/Ikon";
import { bolehAksesModul } from "@/lib/akses";
import { DAFTAR_MODUL } from "@/lib/modul";
import IkonModul from "@/components/IkonModul";
import { LABEL_PERAN, SEMUA_PERAN } from "@/lib/peran";
import {
  ambilDaftarSantri,
  supabaseTerhubung,
  type Santri,
} from "@/lib/data/santri";
import { ambilProfilLogin, type ProfilLogin } from "@/lib/sesi";
import {
  ambilKehadiran,
  ambilRiwayatKehadiranSantri,
  LABEL_STATUS,
  STATUS_KEHADIRAN,
  type StatusKehadiran,
} from "@/lib/data/kehadiran";
import {
  ambilCatatanTerbaru,
  LABEL_KATEGORI,
  type CatatanMusyrif,
} from "@/lib/data/catatan";
import { ambilDaftarSesi, formatTanggalPanjang } from "@/lib/data/olahraga";
import BannerMotivasi from "@/components/BannerMotivasi";
import AvatarInisial from "@/components/AvatarInisial";
import {
  ambilSemesterAdmin,
  statusSemester,
  type SemesterLengkap,
} from "@/lib/data/admin";
import { formatHijriahRingkas, tanggalIsoHariIni } from "@/lib/tanggal";
import { ambilSetoranTerakhir, type SetoranHifzh } from "@/lib/data/hifzh";
import { LABEL_NILAI_SETORAN } from "@/lib/hifzh";

/**
 * Catatan terakhir untuk kartu wali (CONTOH LOKAL SEMENTARA).
 * Selaras dengan catatan contoh lokal di tab Catatan halaman detail
 * santri untuk santri yang sama. Akan diganti lib/data/catatan begitu
 * lapisan data catatan tersedia.
 */
const CATATAN_TERAKHIR_WALI_CONTOH = {
  tanggal: "2026-11-01",
  kategoriLabel: "Akhlaq",
  isi: "Membantu teman sekelasnya menyiapkan tempat wudu sebelum shalat Zhuhur berjamaah.",
  pelaporNama: "Ust. Musyrif Contoh",
};

function formatTanggal(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Tanggal hari ini versi PANJANG (baris tanggal sapaan prototipe). */
function formatTanggalHariIniPanjang(): string {
  return formatTanggalPanjang(tanggalIsoHariIni());
}

/** Rentang pekan berjalan (Senin–Ahad) sebagai tanggal ISO —
 *  dasar hitungan kartu "Olahraga pekan ini" di beranda staf. */
function rentangPekanBerjalan(): { mulai: string; selesai: string } {
  const keIso = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  const hariIni = new Date(`${tanggalIsoHariIni()}T00:00:00`);
  // getDay(): 0 = Ahad ... 6 = Sabtu → geser ke Senin pekan ini.
  const senin = new Date(hariIni);
  senin.setDate(hariIni.getDate() - ((hariIni.getDay() + 6) % 7));
  const ahad = new Date(senin);
  ahad.setDate(senin.getDate() + 6);
  return { mulai: keIso(senin), selesai: keIso(ahad) };
}

/** Pekan berjalan semester dari tanggal mulai/selesai ASLI:
 *  pekan ke-berapa dari total pekan rentang semester. */
function hitungPekanSemester(semester: SemesterLengkap): {
  pekan: number;
  total: number;
} {
  const mulai = new Date(`${semester.tanggalMulai}T00:00:00`).getTime();
  const selesai = new Date(`${semester.tanggalSelesai}T00:00:00`).getTime();
  const hariIni = new Date(`${tanggalIsoHariIni()}T00:00:00`).getTime();
  const total = Math.max(1, Math.ceil((selesai - mulai) / 604_800_000));
  const pekan = Math.min(
    total,
    Math.max(1, Math.floor((hariIni - mulai) / 604_800_000) + 1),
  );
  return { pekan, total };
}

/**
 * Tanggal Hijriah hari ini RINGKAS — dari lib/tanggal.ts, yang
 * memetakan nama bulan sendiri dari bagian angka Intl (nama bulan
 * long dari Intl terbukti salah di perangkat user: "Mei 1448 SM H").
 */
function formatTanggalHijriahHariIni(): string {
  return formatHijriahRingkas();
}

interface RingkasanKehadiranWali {
  hitung: Record<StatusKehadiran, number>;
  total: number;
  persenHadir: number;
}

/** Ikon & warna tint kartu peran pada beranda mode contoh. */
const IKON_PERAN: Record<string, { ikon: NamaIkon; warna: WarnaTint }> = {
  admin: { ikon: "perisai", warna: "emas" },
  pengajar_hifzh: { ikon: "hifzh", warna: "hijau" },
  pengajar_diniyyah: { ikon: "diniyyah", warna: "biru" },
  musyrif: { ikon: "pena", warna: "kuning" },
  wali: { ikon: "hati", warna: "merah" },
};

export default function HalamanBeranda() {
  const modeContoh = !supabaseTerhubung();
  const [anakWali, setAnakWali] = useState<Santri | null>(null);
  const [ringkasanWali, setRingkasanWali] =
    useState<RingkasanKehadiranWali | null>(null);
  const [setoranTerakhirWali, setSetoranTerakhirWali] =
    useState<SetoranHifzh | null>(null);
  const [memuatWali, setMemuatWali] = useState(true);
  const [profilLogin, setProfilLogin] = useState<ProfilLogin | null>(null);
  const [memuatProfil, setMemuatProfil] = useState(!modeContoh);
  // Ringkasan beranda (arahan user 4 Nov 2026: beranda jangan
  // kosong) — angka NYATA dari lapisan data ber-RLS, bukan karangan:
  // staf/admin melihat hitungan HARI INI, wali melihat total
  // tercatat untuk anaknya sendiri (RLS memang hanya meloloskan
  // baris anaknya). null = belum termuat/gagal (bagian disembunyikan).
  const [statistik, setStatistik] = useState<{
    santri: number;
    kehadiran: number;
    setoran: number;
    catatan: number;
    /** Sesi olahraga pada pekan berjalan (Senin–Ahad) — kartu
     *  ke-4 kisi ringkasan 2×2 beranda staf (arahan user 4 Nov
     *  2026). Untuk wali tidak dipakai (nilainya 0). */
    olahraga: number;
  } | null>(null);
  const [semesterBerjalan, setSemesterBerjalan] =
    useState<SemesterLengkap | null>(null);
  // Bahan bagian prototipe: setoran terakhir (beranda hifzh),
  // catatan terbaru + daftar anak & ringkasan per anak (beranda
  // wali) — semuanya dari respons lapisan data yang SAMA dengan
  // hitungan statistik di atas, tanpa panggilan tambahan.
  const [setoranTerbaru, setSetoranTerbaru] = useState<SetoranHifzh[]>([]);
  const [catatanTerbaru, setCatatanTerbaru] = useState<CatatanMusyrif | null>(
    null,
  );
  const [daftarAnak, setDaftarAnak] = useState<Santri[]>([]);
  const [ringkasanAnak, setRingkasanAnak] = useState<
    Record<string, { kehadiran: number; setoran: number }>
  >({});

  // MODE SUPABASE: muat profil pengguna yang login untuk sapaan beranda.
  useEffect(() => {
    if (modeContoh) return;
    let aktif = true;
    (async () => {
      const profil = await ambilProfilLogin();
      if (!aktif) return;
      setProfilLogin(profil);
      setMemuatProfil(false);
    })();
    return () => {
      aktif = false;
    };
  }, [modeContoh]);

  // MODE SUPABASE: muat ringkasan beranda setelah profil diketahui.
  useEffect(() => {
    if (modeContoh || !profilLogin) return;
    let aktif = true;
    (async () => {
      try {
        const hariIni = tanggalIsoHariIni();
        const untukWali = profilLogin.peran === "wali";
        const [daftarSantri, setoran, catatan, semester, sesiOlahraga] =
          await Promise.all([
            ambilDaftarSantri(),
            ambilSetoranTerakhir(100),
            ambilCatatanTerbaru(50),
            ambilSemesterAdmin(),
            // Sesi olahraga hanya untuk kartu ringkasan staf;
            // kegagalannya tidak boleh menyembunyikan statistik
            // lain, jadi ditangkap terpisah menjadi null.
            untukWali
              ? Promise.resolve(null)
              : ambilDaftarSesi().catch(() => null),
          ]);
        const pekan = rentangPekanBerjalan();
        const olahragaPekanIni = sesiOlahraga
          ? sesiOlahraga.data.filter(
              (s) => s.tanggal >= pekan.mulai && s.tanggal <= pekan.selesai,
            ).length
          : 0;
        let kehadiran = 0;
        if (untukWali) {
          // Total tercatat per anak (RLS hanya meloloskan anaknya).
          const perAnak = await Promise.all(
            daftarSantri.data.map((s) => ambilRiwayatKehadiranSantri(s.id)),
          );
          kehadiran = perAnak.reduce((j, h) => j + h.data.length, 0);
          if (!aktif) return;
          setDaftarAnak(daftarSantri.data);
          const perAnakMap: Record<
            string,
            { kehadiran: number; setoran: number }
          > = {};
          daftarSantri.data.forEach((s, i) => {
            perAnakMap[s.id] = {
              kehadiran: perAnak[i]?.data.length ?? 0,
              setoran: setoran.data.filter((x) => x.santriId === s.id).length,
            };
          });
          setRingkasanAnak(perAnakMap);
          setCatatanTerbaru(catatan.data[0] ?? null);
        } else {
          const [hifzh, diniyyah] = await Promise.all([
            ambilKehadiran(hariIni, "hifzh"),
            ambilKehadiran(hariIni, "diniyyah"),
          ]);
          kehadiran = hifzh.data.length + diniyyah.data.length;
        }
        if (!aktif) return;
        setSetoranTerbaru(setoran.data.slice(0, 4));
        setStatistik({
          santri: daftarSantri.data.length,
          kehadiran,
          setoran: untukWali
            ? setoran.data.length
            : setoran.data.filter((s) => s.tanggalMasehi === hariIni).length,
          catatan: untukWali
            ? catatan.data.length
            : catatan.data.filter((c) => c.tanggal === hariIni).length,
          olahraga: olahragaPekanIni,
        });
        setSemesterBerjalan(
          semester.data.find((s) => statusSemester(s) === "berjalan") ?? null,
        );
      } catch {
        // Ringkasan gagal dimuat: bagian ini disembunyikan saja,
        // beranda tetap berfungsi tanpa angka.
        if (aktif) {
          setStatistik(null);
          setSemesterBerjalan(null);
        }
      }
    })();
    return () => {
      aktif = false;
    };
  }, [modeContoh, profilLogin]);

  useEffect(() => {
    // Tampilan wali contoh hanya berjalan pada mode contoh.
    if (!modeContoh) {
      setMemuatWali(false);
      return;
    }
    let aktif = true;
    (async () => {
      try {
        const daftar = await ambilDaftarSantri();
        // Wali contoh dipasangkan ke santri contoh pertama. Pada data
        // asli, pasangan ini datang dari tabel wali_santri untuk akun
        // wali yang sedang masuk — tidak dipilih dari daftar umum.
        const anak = daftar.data[0] ?? null;
        if (!aktif || !anak) {
          if (aktif) setMemuatWali(false);
          return;
        }
        setAnakWali(anak);
        const [riwayat, setoran] = await Promise.all([
          ambilRiwayatKehadiranSantri(anak.id),
          ambilSetoranTerakhir(50),
        ]);
        if (!aktif) return;
        const hitung: Record<StatusKehadiran, number> = {
          hadir: 0,
          sakit: 0,
          izin: 0,
          alpa: 0,
        };
        for (const b of riwayat.data) hitung[b.status] += 1;
        const total = riwayat.data.length;
        setRingkasanWali({
          hitung,
          total,
          persenHadir:
            total > 0 ? Math.round((hitung.hadir / total) * 1000) / 10 : 0,
        });
        setSetoranTerakhirWali(
          setoran.data.find((s) => s.santriId === anak.id) ?? null,
        );
        setMemuatWali(false);
      } catch {
        if (aktif) setMemuatWali(false);
      }
    })();
    return () => {
      aktif = false;
    };
  }, [modeContoh]);

  // ===== Beranda MODE SUPABASE: sapaan sesuai profil login =====
  if (!modeContoh) {
    const hijriah = formatTanggalHijriahHariIni();
    const untukWali = profilLogin?.peran === "wali";
    const pekanSemester = semesterBerjalan
      ? hitungPekanSemester(semesterBerjalan)
      : null;
    // Kartu hero prototipe per peran: statistik utama peran itu
    // (angka NYATA yang sama dengan ringkasan sebelumnya).
    const hero =
      profilLogin?.peran === "pengajar_hifzh"
        ? {
            label: "Setoran hari ini",
            nilai: statistik?.setoran ?? 0,
            sub: "setoran tercatat hari ini",
            cta: "Setoran baru",
            href: "/hifzh",
          }
        : profilLogin?.peran === "musyrif"
          ? {
              label: "Catatan hari ini",
              nilai: statistik?.catatan ?? 0,
              sub: "catatan tercatat hari ini",
              cta: "Catatan baru",
              href: "/catatan",
            }
          : profilLogin?.peran === "pengajar_diniyyah"
            ? {
                label: "Kehadiran hari ini",
                nilai: statistik?.kehadiran ?? 0,
                sub: "sesi hifzh + diniyyah terisi",
                cta: "Isi nilai",
                href: "/diniyyah",
              }
            : {
                label: "Kehadiran hari ini",
                nilai: statistik?.kehadiran ?? 0,
                sub: "sesi hifzh + diniyyah terisi",
                cta: "Isi kehadiran",
                href: "/kehadiran",
              };
    const kartuLain = statistik
      ? [
          {
            angka: statistik.santri,
            label: "Santri aktif",
            sub: "Marhalah Wustha",
          },
          ...(profilLogin?.peran === "pengajar_hifzh"
            ? [
                {
                  angka: statistik.kehadiran,
                  label: "Kehadiran hari ini",
                  sub: "sesi hifzh + diniyyah",
                },
                {
                  angka: statistik.catatan,
                  label: "Catatan hari ini",
                  sub: "dari musyrif & pengajar",
                },
              ]
            : profilLogin?.peran === "musyrif"
              ? [
                  {
                    angka: statistik.kehadiran,
                    label: "Kehadiran hari ini",
                    sub: "sesi hifzh + diniyyah",
                  },
                  {
                    angka: statistik.setoran,
                    label: "Setoran hari ini",
                    sub: "dari semua penyimak",
                  },
                ]
              : [
                  {
                    angka: statistik.setoran,
                    label: "Setoran hari ini",
                    sub: "dari semua penyimak",
                  },
                  {
                    angka: statistik.catatan,
                    label: "Catatan hari ini",
                    sub: "dari musyrif & pengajar",
                  },
                ]),
          // Kartu ke-4 (arahan user 4 Nov 2026: kisi ringkasan
          // jadi 4 kartu rapi 2×2): sesi olahraga pekan berjalan,
          // dari lapisan data olahraga yang sama dengan halaman
          // Olahraga — angka nyata, bukan statis.
          {
            angka: statistik.olahraga,
            label: "Olahraga pekan ini",
            sub: "sesi tercatat pekan ini",
          },
        ]
      : [];

    // Sapaan prototipe: baris tanggal (Masehi panjang + Hijriah
    // emas) lalu judul "Assalamu'alaikum, {nama}".
    const sapaan = (
      <>
        <p className="sapaan-tanggal">
          {formatTanggalHariIniPanjang()}
          {hijriah ? (
            <>
              {" · "}
              <span className="sapaan-hijri">{hijriah}</span>
            </>
          ) : null}
        </p>
        <h1 className="sapaan-judul">
          Assalamu&rsquo;alaikum,{" "}
          {memuatProfil ? "…" : (profilLogin?.nama ?? "Pengguna")}
        </h1>
        {!memuatProfil && !profilLogin && (
          <p className="pesan-galat" role="alert">
            Profil pengguna belum ditemukan di tabel profiles. Hubungi admin
            agar akun Anda didaftarkan profil dan perannya.
          </p>
        )}
      </>
    );

    // Strip semester berjalan — sejak arahan user 4 Nov 2026
    // berdiri sendiri PALING BAWAH beranda (di bawah banner
    // motivasi), tidak lagi berdampingan dengan kartu hadis.
    const stripSemester =
      semesterBerjalan && pekanSemester ? (
        <div className="kartu-semester">
          <div className="semester-baris">
            <span className="semester-nama">
              {semesterBerjalan.nama} · {semesterBerjalan.tahunAjaran}
            </span>
            <span className="semester-pekan">
              Pekan {pekanSemester.pekan}/{pekanSemester.total}
            </span>
          </div>
          <div
            className="bilah"
            role="img"
            aria-label={`Pekan ${pekanSemester.pekan} dari ${pekanSemester.total}`}
          >
            <div
              className="bilah-isi"
              style={{
                width: `${Math.round(
                  (pekanSemester.pekan / pekanSemester.total) * 100,
                )}%`,
              }}
            />
          </div>
        </div>
      ) : null;

    // Tumpukan paling bawah beranda (urutan baru arahan user
    // 4 Nov 2026): banner motivasi 5 slide DI BAWAH semua modul,
    // lalu strip semester sebagai penutup.
    const bagianBawahBeranda = profilLogin ? (
      <div className="tumpuk-bawah-beranda">
        <BannerMotivasi />
        {stripSemester}
      </div>
    ) : null;

    if (untukWali) {
      // ===== Beranda WALI (prototipe BerandaWali) =====
      return (
        <>
          {sapaan}
          {profilLogin && (
            <>
              {daftarAnak.length === 0 ? (
                <section className="kartu">
                  <h2>Belum ada anak tertaut</h2>
                  <p>
                    Akun Anda belum ditautkan ke santri mana pun. Sampaikan ke
                    admin pondok agar anak Anda ditautkan; setelah itu data anak
                    tampil di sini.
                  </p>
                </section>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {daftarAnak.map((anak) => (
                    <Link
                      key={anak.id}
                      href={`/santri/${anak.id}`}
                      className="kartu"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        marginBottom: 0,
                        color: "inherit",
                        textDecoration: "none",
                      }}
                    >
                      <AvatarInisial nama={anak.nama} ukuran="besar" />
                      <span className="baris-teks">
                        <span
                          style={{
                            display: "block",
                            fontSize: 12,
                            color: "var(--teks-redup)",
                          }}
                        >
                          Anak Anda
                        </span>
                        <span
                          style={{
                            display: "block",
                            fontSize: 18,
                            fontWeight: 700,
                            lineHeight: 1.3,
                          }}
                        >
                          {anak.nama}
                        </span>
                        <span className="baris-ket">
                          {anak.kelasNama}
                          {anak.nis ? ` · NIS ${anak.nis}` : ""}
                        </span>
                        <span className="baris-ket">
                          Setoran tercatat{" "}
                          {ringkasanAnak[anak.id]?.setoran ?? 0} · Kehadiran
                          tercatat {ringkasanAnak[anak.id]?.kehadiran ?? 0}
                        </span>
                      </span>
                      <span className="baris-kanan">
                        <Ikon nama="chevron-kanan" ukuran={18} />
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {statistik && (
                <>
                  <div className="kepala-seksi">
                    <h2 className="judul-seksi">Ringkasan</h2>
                  </div>
                  <div className="kisi-ringkasan kisi-ringkasan--wali">
                    {[
                      {
                        angka: statistik.santri,
                        label: "Anak tertaut",
                        sub: "tertaut ke akun Anda",
                      },
                      {
                        angka: statistik.kehadiran,
                        label: "Kehadiran tercatat",
                        sub: "semua sesi tercatat",
                      },
                      {
                        angka: statistik.setoran,
                        label: "Setoran tercatat",
                        sub: "semua setoran tercatat",
                      },
                      {
                        angka: statistik.catatan,
                        label: "Catatan tercatat",
                        sub: "dari musyrif & pengajar",
                      },
                    ].map((s) => (
                      <div key={s.label} className="kartu-stat">
                        <span className="stat-label">{s.label}</span>
                        <span className="stat-angka">{s.angka}</span>
                        <span className="stat-sub">{s.sub}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {catatanTerbaru && (
                <>
                  <div className="kepala-seksi">
                    <h2 className="judul-seksi">Catatan musyrif terakhir</h2>
                  </div>
                  <section className="kartu">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <strong style={{ fontSize: 14 }}>
                        {catatanTerbaru.santriNama}
                      </strong>
                      <span className="lencana lencana--netral">
                        {LABEL_KATEGORI[catatanTerbaru.kategori]}
                      </span>
                    </div>
                    <p style={{ margin: "8px 0 6px", fontSize: 14 }}>
                      {catatanTerbaru.isi}
                    </p>
                    <p className="catatan-kaki" style={{ margin: 0 }}>
                      {catatanTerbaru.pelaporNama} ·{" "}
                      {formatTanggal(catatanTerbaru.tanggal)}
                    </p>
                  </section>
                </>
              )}

              {bagianBawahBeranda}

              <div style={{ marginTop: 16 }}>
                <Link
                  href="/laporan"
                  className="tombol tombol-sekunder tombol-penuh"
                >
                  Lihat perkembangan lengkap
                </Link>
              </div>
            </>
          )}
        </>
      );
    }

    // ===== Beranda staf & admin (prototipe Home) =====
    return (
      <>
        {sapaan}

        {/* Urutan beranda baru (arahan user 4 Nov 2026): kartu
            hero peran selebar penuh, lalu EMPAT kartu ringkasan
            rapi 2×2 (.kisi-stat: 2 kolom di HP, 4 kolom di PC). */}
        {profilLogin && statistik && (
          <>
            <section className="aksi-beranda" aria-label="Aktivitas utama">
              <span className="aksi-beranda-ikon">
                <Ikon
                  nama={
                    profilLogin.peran === "musyrif"
                      ? "catatan"
                      : profilLogin.peran === "pengajar_diniyyah"
                        ? "diniyyah"
                        : profilLogin.peran === "admin"
                          ? "santri"
                          : "hifzh"
                  }
                  ukuran={24}
                />
              </span>
              <div className="aksi-beranda-teks">
                <span className="aksi-beranda-label">Aktivitas Anda</span>
                <h2>{hero.label}</h2>
                <p>
                  <strong>{hero.nilai}</strong> · {hero.sub}
                </p>
              </div>
              <Link href={hero.href} className="tombol">
                {hero.cta}
                <Ikon nama="chevron-kanan" ukuran={16} />
              </Link>
            </section>
            <div className="kisi-stat">
              {kartuLain.map((s) => (
                <div key={s.label} className="kartu-stat">
                  <span className="stat-label">{s.label}</span>
                  <span className="stat-angka">{s.angka}</span>
                  <span className="stat-sub">{s.sub}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {profilLogin && (
          <>
            <div className="kepala-seksi">
              <h2 className="judul-seksi">Akses cepat</h2>
            </div>
            <div className="kisi-menu kisi-menu--kerja">
              {DAFTAR_MODUL.filter((modul) =>
                bolehAksesModul(profilLogin.peran, modul.modul),
              ).map((modul) => (
                <Link key={modul.href} href={modul.href} className="item-menu">
                  <IkonModul
                    modul={modul.modul}
                    ikon={modul.ikon}
                    warna={modul.warna}
                  />
                  <span className="item-menu-teks">
                    <span className="item-menu-label">{modul.label}</span>
                    <span className="item-menu-ket">{modul.keterangan}</span>
                  </span>
                  <span className="item-menu-panah">
                    <Ikon nama="chevron-kanan" ukuran={16} />
                  </span>
                </Link>
              ))}
            </div>

            {profilLogin.peran === "pengajar_hifzh" &&
              setoranTerbaru.length > 0 && (
                <>
                  <div className="kepala-seksi">
                    <h2 className="judul-seksi">Setoran terakhir</h2>
                    <Link href="/hifzh?tab=riwayat" className="aksi-seksi">
                      Semua
                    </Link>
                  </div>
                  <div className="daftar-ringkas">
                    {setoranTerbaru.map((s) => (
                      <div key={s.id} className="baris-ringkas">
                        <AvatarInisial nama={s.santriNama} ukuran="kecil" />
                        <span className="baris-teks">
                          <span className="baris-judul">{s.santriNama}</span>
                          <span className="baris-ket">
                            {s.jenis} · {s.surat} {s.ayatDari}–{s.ayatSampai} ·{" "}
                            {formatTanggal(s.tanggalMasehi)}
                          </span>
                        </span>
                        <span
                          className={`lencana ${
                            s.nilaiHuruf === "L" ? "lencana--l" : "lencana--u"
                          }`}
                        >
                          {s.nilaiHuruf} · {LABEL_NILAI_SETORAN[s.nilaiHuruf]}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
          </>
        )}

        {bagianBawahBeranda}
      </>
    );
  }

  return (
    <>
      <PenandaTahap />
      {/* Sapaan prototipe menggantikan banner biru mode contoh. */}
      <p className="sapaan-tanggal">
        {formatTanggalHariIniPanjang()}
        {formatTanggalHijriahHariIni() ? (
          <>
            {" · "}
            <span className="sapaan-hijri">
              {formatTanggalHijriahHariIni()}
            </span>
          </>
        ) : null}
      </p>
      <h1 className="sapaan-judul">
        Assalamu&rsquo;alaikum, selamat datang di Aplikasi Santri
      </h1>
      <p className="subjudul">
        Aplikasi monitoring santri Marhalah Wustha; tampilan menyesuaikan peran
        pengguna yang masuk.
      </p>

      {/* Kartu peran mode contoh: ikon + label saja (revisi biru —
          paragraf ringkasan peran tidak lagi ditampilkan di beranda
          pada mode apa pun; penjelasan hak akses lengkap ada di
          halaman Akun pada mode Supabase). */}
      <div className="kisi-peran">
        {SEMUA_PERAN.map((peran) => (
          <section key={peran} className="kartu kartu-peran">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <LingkaranIkon
                nama={IKON_PERAN[peran].ikon}
                warna={IKON_PERAN[peran].warna}
              />
              <p className="label-peran" style={{ margin: 0 }}>
                {LABEL_PERAN[peran]}
              </p>
            </div>
          </section>
        ))}
      </div>

      {/* ===== Tampilan Wali (contoh) — tambahan Jalur F ===== */}
      <section className="kartu" style={{ marginTop: 12 }}>
        <PenandaTahap teks="TAMPILAN WALI (CONTOH) · HANYA-LIHAT" />
        <h2>Beranda wali: hanya anaknya sendiri</h2>
        {memuatWali && <p>Memuat contoh tampilan wali…</p>}
        {!memuatWali && !anakWali && <p>Data contoh santri belum tersedia.</p>}
        {!memuatWali && anakWali && (
          <>
            <p>
              Contoh akun wali <strong>{anakWali.namaAyahWali}</strong> hanya
              melihat satu anaknya: <strong>{anakWali.nama}</strong> (
              {anakWali.kelasNama}). Santri lain tidak tampil sama sekali, dan
              di sini tidak ada tombol ubah — wali hanya membaca.
            </p>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  Kehadiran anak
                </div>
                {ringkasanWali ? (
                  <>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {STATUS_KEHADIRAN.map((s) => (
                        <span
                          key={s}
                          className={`lencana lencana--besar lencana--${s}`}
                        >
                          {LABEL_STATUS[s]}: {ringkasanWali.hitung[s]}
                        </span>
                      ))}
                    </div>
                    <div
                      style={{
                        color: "var(--teks-redup)",
                        fontSize: 13,
                        marginTop: 6,
                      }}
                    >
                      Dari {ringkasanWali.total} sesi tercatat · Hadir{" "}
                      {ringkasanWali.persenHadir.toLocaleString("id-ID", {
                        maximumFractionDigits: 1,
                      })}
                      %
                    </div>
                    <div
                      className="bilah"
                      style={{ marginTop: 8, maxWidth: 320 }}
                      role="img"
                      aria-label={`Persentase hadir ${ringkasanWali.persenHadir}%`}
                    >
                      <div
                        className="bilah-isi"
                        style={{ width: `${ringkasanWali.persenHadir}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <p>Memuat ringkasan kehadiran…</p>
                )}
              </div>

              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  Hifzh terakhir
                </div>
                {setoranTerakhirWali ? (
                  <p
                    style={{
                      margin: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span>
                      {setoranTerakhirWali.jenis} · {setoranTerakhirWali.surat}{" "}
                      ayat {setoranTerakhirWali.ayatDari}–
                      {setoranTerakhirWali.ayatSampai} ·{" "}
                      {formatTanggal(setoranTerakhirWali.tanggalMasehi)}
                    </span>
                    <span
                      className={`lencana lencana--besar ${
                        setoranTerakhirWali.nilaiHuruf === "L"
                          ? "lencana--l"
                          : "lencana--u"
                      }`}
                    >
                      {setoranTerakhirWali.nilaiHuruf} ·{" "}
                      {LABEL_NILAI_SETORAN[setoranTerakhirWali.nilaiHuruf]}
                    </span>
                  </p>
                ) : (
                  <p style={{ margin: 0 }}>
                    Belum ada setoran yang tampil untuk anak ini pada data
                    contoh tahap ini (modul hifzh memakai daftar santri contoh
                    tersendiri; pada data asli setoran anak langsung tampil di
                    sini).
                  </p>
                )}
              </div>

              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  Catatan terakhir
                </div>
                <p style={{ margin: 0 }}>
                  {CATATAN_TERAKHIR_WALI_CONTOH.kategoriLabel} ·{" "}
                  {formatTanggal(CATATAN_TERAKHIR_WALI_CONTOH.tanggal)} —{" "}
                  {CATATAN_TERAKHIR_WALI_CONTOH.isi}
                </p>
                <div style={{ color: "var(--teks-redup)", fontSize: 13 }}>
                  Pelapor: {CATATAN_TERAKHIR_WALI_CONTOH.pelaporNama}
                </div>
              </div>
            </div>
            <p style={{ marginTop: 12 }}>
              <Link
                href={`/santri/${anakWali.id}`}
                className="tombol tombol-kecil"
              >
                Lihat detail anak
                <Ikon nama="chevron-kanan" ukuran={15} />
              </Link>
            </p>
          </>
        )}
        <p className="catatan-kaki">
          Pembatasnya bukan tampilan ini: di database, aturan RLS hanya
          meloloskan baris santri yang tertaut ke akun wali di tabel
          wali_santri. Wali lain tidak bisa membuka data anak ini walau
          mengetahui alamat halamannya — penolakan itu akan dibuktikan pada uji
          negatif Tahap 4.
        </p>
      </section>
    </>
  );
}
