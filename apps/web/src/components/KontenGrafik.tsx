"use client";

/**
 * KontenGrafik — tampilan "Ringkasan visual" halaman /laporan
 * (Fase 2 audit, 3 Nov 2026: Grafik dilebur ke Laporan). Berisi enam
 * grafik yang sebelumnya menjadi halaman Grafik tersendiri (revisi
 * biru 3 Nov 2026).
 *
 * Enam grafik dengan GAYA BERBEDA, semuanya dihitung dari fungsi
 * lapisan data yang SUDAH ADA — halaman ini tidak mengarang data:
 *  a. Batang vertikal polos — jumlah Hadir per pekan
 *     (lib/data/rekap.ts: ambilRekapPekanan, dijumlah per pekan).
 *  b. Donat SVG — komposisi status kehadiran semester H/S/I/A
 *     (ambilRekapSemester, dijumlah lintas santri).
 *  c. Garis/area SVG — progres jumlah setoran hifzh per pekan
 *     (ambilAgregatGrafikHifzh, agregat mingguan per jenis dijumlah).
 *  d. Batang horizontal — rata-rata gabungan nilai diniyyah per
 *     mapel (ambilNilaiHarianSantri + ambilNilaiUjianSantri per
 *     santri yang bisa diakses peran ini, diringkas dengan
 *     hitungRingkasanMapel lalu dirata-rata lintas santri).
 *  e. Donat proporsi — hasil setoran Lancar vs Ulang
 *     (dari agregat hifzh yang sama dengan c).
 *  f. Batang vertikal bulat bergradasi — jumlah sesi olahraga per
 *     bulan (lib/data/olahraga.ts: ambilDaftarSesi, dikelompokkan
 *     per bulan tanggal sesi).
 *
 * Semua fungsi sumber menghormati RLS: staf melihat agregat semua
 * santri, wali hanya agregat anaknya sendiri. Keadaan kosong selalu
 * ditampilkan sebagai pesan "Belum ada data." — bukan angka karangan.
 * Boleh dibuka semua peran yang login (modul "laporan" di
 * src/lib/akses.ts = semua peran; gerbangnya dipasang halaman
 * /laporan lewat PenjagaModul, bukan di komponen ini).
 *
 * Perbaikan audit Fase 1 (3 Nov 2026):
 * - Donat komposisi kehadiran memakai PILIHAN SEMESTER (bawaan:
 *   semester yang sedang berjalan menurut tanggal hari ini), tidak
 *   lagi menjumlahkan semua semester sekaligus.
 * - Di bawah tiap judul ada label cakupan data yang sedang dibaca.
 * - Galat ≠ kosong: setiap grafik dimuat mandiri; kegagalannya
 *   menampilkan keadaan gagal dengan tombol coba
 *   lagi khusus grafik itu, BUKAN tulisan "Belum ada data".
 * - Label grafik pertama diperjelas: yang dihitung adalah catatan
 *   hadir per pekan, bukan jumlah santri unik.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import PenandaTahap from "@/components/PenandaTahap";
import PanelAnalitik from "@/components/PanelAnalitik";
import {
  ambilAgregatGrafikHifzh,
  ambilRekapPekanan,
  ambilRekapSemester,
  type BarisRekapSemester,
} from "@/lib/data/rekap";
import { ambilDaftarSantri } from "@/lib/data/santri";
import {
  ambilNilaiHarianSantri,
  ambilNilaiUjianSantri,
  ambilSemester,
  hitungRingkasanMapel,
  type SemesterRef,
} from "@/lib/data/diniyyah";
import { ambilDaftarSesi } from "@/lib/data/olahraga";

/* ------------------------------------------------------------------ */
/* Tipe & pembantu                                                    */
/* ------------------------------------------------------------------ */

interface TitikBatang {
  label: string;
  nilai: number;
}

interface KomposisiStatus {
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  total: number;
}

function formatTanggalSingkat(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

function labelBulanSingkat(isoAwalBulan: string): string {
  return new Date(`${isoAwalBulan}T00:00:00`).toLocaleDateString("id-ID", {
    month: "short",
    year: "2-digit",
  });
}

function tanggalHariIniIso(): string {
  const d = new Date();
  const dua = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
}

interface OpsiSemester {
  id: string;
  label: string;
}

export default function KontenGrafik() {
  // a. Kehadiran per pekan
  const [hadirPerPekan, setHadirPerPekan] = useState<TitikBatang[] | null>(
    null,
  );
  const [galatPekanan, setGalatPekanan] = useState<string | null>(null);

  // b. Donat komposisi per semester terpilih
  const [barisSemester, setBarisSemester] = useState<
    BarisRekapSemester[] | null
  >(null);
  const [daftarSemester, setDaftarSemester] = useState<SemesterRef[]>([]);
  const [semesterId, setSemesterId] = useState<string>("");
  const [galatDonat, setGalatDonat] = useState<string | null>(null);

  // c + e. Agregat hifzh (progres mingguan & proporsi L/U)
  const [progresHifzh, setProgresHifzh] = useState<TitikBatang[] | null>(null);
  const [proporsiLU, setProporsiLU] = useState<{ l: number; u: number } | null>(
    null,
  );
  const [galatHifzh, setGalatHifzh] = useState<string | null>(null);

  // d. Rata-rata diniyyah per mapel
  const [rataMapel, setRataMapel] = useState<
    { mapel: string; rata: number }[] | null
  >(null);
  const [galatDiniyyah, setGalatDiniyyah] = useState<string | null>(null);

  // f. Sesi olahraga per bulan
  const [sesiPerBulan, setSesiPerBulan] = useState<TitikBatang[] | null>(null);
  const [galatOlahraga, setGalatOlahraga] = useState<string | null>(null);

  const [sumberContoh, setSumberContoh] = useState(false);
  const tandaiContoh = useCallback((b: boolean) => {
    if (b) setSumberContoh(true);
  }, []);

  /* ---- a. Hadir per pekan: jumlahkan catatan hadir lintas santri,
         8 pekan terakhir. ---- */
  const muatPekanan = useCallback(async () => {
    setGalatPekanan(null);
    try {
      const pekanan = await ambilRekapPekanan();
      tandaiContoh(pekanan.sumberContoh);
      const perPekan = new Map<string, number>();
      for (const b of pekanan.data) {
        perPekan.set(
          b.pekanMulai,
          (perPekan.get(b.pekanMulai) ?? 0) + b.jumlahHadir,
        );
      }
      setHadirPerPekan(
        [...perPekan.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-8)
          .map(([pekanMulai, nilai]) => ({
            label: formatTanggalSingkat(pekanMulai),
            nilai,
          })),
      );
    } catch (e: unknown) {
      setGalatPekanan(
        e instanceof Error ? e.message : "Gagal memuat data kehadiran.",
      );
    }
  }, [tandaiContoh]);

  /* ---- b. Donat: daftar semester + baris rekap semester; donat
         hanya menjumlahkan baris pada semester terpilih. ---- */
  const muatDonat = useCallback(async () => {
    setGalatDonat(null);
    try {
      const [semesterHasil, semesteran] = await Promise.all([
        ambilSemester(),
        ambilRekapSemester(),
      ]);
      tandaiContoh(semesterHasil.sumberContoh || semesteran.sumberContoh);
      setDaftarSemester(semesterHasil.data);
      setBarisSemester(semesteran.data);
      // Bawaan pilihan: semester yang sedang berjalan menurut tanggal
      // hari ini; cadangan: semester pertama pada daftar pilihan.
      setSemesterId((lama) => {
        if (lama) return lama;
        const opsi = opsiSemesterDari(semesterHasil.data, semesteran.data);
        const hariIni = tanggalHariIniIso();
        const berjalan = semesterHasil.data.find(
          (s) =>
            s.tanggalMulai &&
            s.tanggalSelesai &&
            hariIni >= s.tanggalMulai &&
            hariIni <= s.tanggalSelesai,
        );
        return berjalan?.id ?? opsi[0]?.id ?? "";
      });
    } catch (e: unknown) {
      setGalatDonat(
        e instanceof Error ? e.message : "Gagal memuat data semester.",
      );
    }
  }, [tandaiContoh]);

  /* ---- c + e. Progres setoran per pekan & proporsi L vs U dari
         agregat hifzh yang sama. ---- */
  const muatHifzh = useCallback(async () => {
    setGalatHifzh(null);
    try {
      const agregat = await ambilAgregatGrafikHifzh();
      tandaiContoh(agregat.sumberContoh);
      const perPeriode = new Map<string, number>();
      let totalL = 0;
      let totalU = 0;
      for (const b of agregat.data.mingguan) {
        perPeriode.set(
          b.periodeMulai,
          (perPeriode.get(b.periodeMulai) ?? 0) + b.jumlahSetoran,
        );
        totalL += b.jumlahL;
        totalU += b.jumlahU;
      }
      setProgresHifzh(
        [...perPeriode.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-8)
          .map(([periodeMulai, nilai]) => ({
            label: formatTanggalSingkat(periodeMulai),
            nilai,
          })),
      );
      setProporsiLU({ l: totalL, u: totalU });
    } catch (e: unknown) {
      setGalatHifzh(
        e instanceof Error ? e.message : "Gagal memuat data hifzh.",
      );
    }
  }, [tandaiContoh]);

  /* ---- d. Rata-rata nilai diniyyah per mapel: per santri yang bisa
         diakses peran ini (RLS), diringkas lalu dirata-rata. ---- */
  const muatDiniyyah = useCallback(async () => {
    setGalatDiniyyah(null);
    try {
      const daftar = await ambilDaftarSantri();
      tandaiContoh(daftar.sumberContoh);
      const perMapel = new Map<string, number[]>();
      await Promise.all(
        daftar.data.map(async (s) => {
          const [harian, ujian] = await Promise.all([
            ambilNilaiHarianSantri(s.id),
            ambilNilaiUjianSantri(s.id),
          ]);
          tandaiContoh(harian.sumberContoh || ujian.sumberContoh);
          for (const r of hitungRingkasanMapel(harian.data, ujian.data)) {
            if (r.rataGabungan === null) continue;
            const ada = perMapel.get(r.mapel) ?? [];
            ada.push(r.rataGabungan);
            perMapel.set(r.mapel, ada);
          }
        }),
      );
      setRataMapel(
        [...perMapel.entries()]
          .map(([mapel, nilai]) => ({
            mapel,
            rata:
              Math.round(
                (nilai.reduce((a, b) => a + b, 0) / nilai.length) * 10,
              ) / 10,
          }))
          .sort((a, b) => b.rata - a.rata),
      );
    } catch (e: unknown) {
      setGalatDiniyyah(
        e instanceof Error ? e.message : "Gagal memuat data diniyyah.",
      );
    }
  }, [tandaiContoh]);

  /* ---- f. Sesi olahraga per bulan: kelompokkan tanggal sesi. ---- */
  const muatOlahraga = useCallback(async () => {
    setGalatOlahraga(null);
    try {
      const sesi = await ambilDaftarSesi();
      tandaiContoh(sesi.sumberContoh);
      const perBulan = new Map<string, number>();
      for (const s of sesi.data) {
        const bulan = s.tanggal.slice(0, 7);
        perBulan.set(bulan, (perBulan.get(bulan) ?? 0) + 1);
      }
      setSesiPerBulan(
        [...perBulan.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-6)
          .map(([bulan, nilai]) => ({
            label: labelBulanSingkat(`${bulan}-01`),
            nilai,
          })),
      );
    } catch (e: unknown) {
      setGalatOlahraga(
        e instanceof Error ? e.message : "Gagal memuat data olahraga.",
      );
    }
  }, [tandaiContoh]);

  useEffect(() => {
    void muatPekanan();
    void muatDonat();
    void muatHifzh();
    void muatDiniyyah();
    void muatOlahraga();
  }, [muatPekanan, muatDonat, muatHifzh, muatDiniyyah, muatOlahraga]);

  /* Pilihan semester untuk donat: dari daftar semester resmi; bila
     daftar itu kosong, turunkan dari baris rekap yang ada. */
  const opsiSemester = opsiSemesterDari(daftarSemester, barisSemester ?? []);
  const semesterTerpilih =
    opsiSemester.find((o) => o.id === semesterId) ?? opsiSemester[0];

  /* Komposisi donat: HANYA baris pada semester terpilih. */
  const komposisi: KomposisiStatus | null = useMemo(() => {
    if (!barisSemester || !semesterTerpilih) return null;
    const komp: KomposisiStatus = {
      hadir: 0,
      sakit: 0,
      izin: 0,
      alpa: 0,
      total: 0,
    };
    for (const b of barisSemester) {
      if (b.semesterId !== semesterTerpilih.id) continue;
      komp.hadir += b.jumlahHadir;
      komp.sakit += b.jumlahSakit;
      komp.izin += b.jumlahIzin;
      komp.alpa += b.jumlahAlpa;
      komp.total += b.totalSesi;
    }
    return komp;
  }, [barisSemester, semesterTerpilih]);

  return (
    <>
      {sumberContoh && <PenandaTahap teks="DATA CONTOH · FIKSI" />}
      <PanelAnalitik
        data={{
          hadir: hadirPerPekan,
          setoran: progresHifzh,
          olahraga: sesiPerBulan,
          nilai: rataMapel,
          komposisi,
          hasil: proporsiLU,
        }}
        galat={{
          hadir: galatPekanan,
          setoran: galatHifzh,
          olahraga: galatOlahraga,
          nilai: galatDiniyyah,
          komposisi: galatDonat,
        }}
        muatUlang={{
          hadir: () => void muatPekanan(),
          setoran: () => void muatHifzh(),
          olahraga: () => void muatOlahraga(),
          nilai: () => void muatDiniyyah(),
          komposisi: () => void muatDonat(),
        }}
        semester={opsiSemester}
        semesterId={semesterTerpilih?.id ?? ""}
        onSemester={setSemesterId}
      />
    </>
  );
}

/**
 * Pilihan semester untuk filter donat: utamakan daftar semester dari
 * lapisan data diniyyah (nama + tahun ajaran); bila daftar itu kosong
 * (mis. baris semester belum dibuat), turunkan pilihan unik dari
 * baris rekap semester yang tersedia agar filter tetap bisa dipakai.
 */
function opsiSemesterDari(
  daftar: SemesterRef[],
  baris: BarisRekapSemester[],
): OpsiSemester[] {
  if (daftar.length > 0) {
    return daftar.map((s) => ({
      id: s.id,
      label: `${s.nama} · ${s.tahunAjaran}`,
    }));
  }
  const unik = new Map<string, string>();
  for (const b of baris) {
    if (!unik.has(b.semesterId)) unik.set(b.semesterId, b.semesterNama);
  }
  return [...unik.entries()].map(([id, nama]) => ({ id, label: nama }));
}
