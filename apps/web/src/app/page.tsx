"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BerandaMonitoring, {
  type StatistikBeranda,
} from "@/components/BerandaMonitoring";
import AvatarInisial from "@/components/AvatarInisial";
import { Ikon } from "@/components/Ikon";
import {
  ambilDaftarSantri,
  supabaseTerhubung,
  type Santri,
} from "@/lib/data/santri";
import { ambilProfilLogin, type ProfilLogin } from "@/lib/sesi";
import {
  ambilKehadiran,
  ambilRiwayatKehadiranSantri,
} from "@/lib/data/kehadiran";
import {
  ambilCatatanTerbaru,
  LABEL_KATEGORI,
  type CatatanMusyrif,
} from "@/lib/data/catatan";
import { ambilDaftarSesi } from "@/lib/data/olahraga";
import {
  ambilSemesterAdmin,
  statusSemester,
  type SemesterLengkap,
} from "@/lib/data/admin";
import { tanggalIsoHariIni, formatHijriahRingkas } from "@/lib/tanggal";
import { ambilSetoranTerakhir, type SetoranHifzh } from "@/lib/data/hifzh";
import { LABEL_NILAI_SETORAN } from "@/lib/hifzh";

function formatTanggal(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function rentangPekanBerjalan() {
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const awal = new Date(`${tanggalIsoHariIni()}T00:00:00`);
  awal.setDate(awal.getDate() - ((awal.getDay() + 6) % 7));
  const akhir = new Date(awal);
  akhir.setDate(awal.getDate() + 6);
  return { mulai: iso(awal), selesai: iso(akhir) };
}

/** Beranda memakai sumber data dan pembatas peran aplikasi yang sama.
 * Mode contoh hanya aktif ketika konfigurasi backend memang belum terisi. */
export default function HalamanBeranda() {
  const modeContoh = !supabaseTerhubung();
  const [profil, setProfil] = useState<ProfilLogin | null>(null);
  const [memuatProfil, setMemuatProfil] = useState(!modeContoh);
  const [memuatData, setMemuatData] = useState(true);
  const [galat, setGalat] = useState(false);
  const [percobaan, setPercobaan] = useState(0);
  const [statistik, setStatistik] = useState<StatistikBeranda | null>(null);
  const [santri, setSantri] = useState<Santri[]>([]);
  const [semester, setSemester] = useState<SemesterLengkap | null>(null);
  const [setoranTerbaru, setSetoranTerbaru] = useState<SetoranHifzh[]>([]);
  const [catatanTerbaru, setCatatanTerbaru] = useState<CatatanMusyrif | null>(
    null,
  );
  const [ringkasanAnak, setRingkasanAnak] = useState<
    Record<string, { kehadiran: number; setoran: number }>
  >({});

  useEffect(() => {
    if (modeContoh) return;
    let aktif = true;
    ambilProfilLogin()
      .then((p) => {
        if (aktif) setProfil(p);
      })
      .catch(() => {
        if (aktif) setProfil(null);
      })
      .finally(() => {
        if (aktif) setMemuatProfil(false);
      });
    return () => {
      aktif = false;
    };
  }, [modeContoh]);

  useEffect(() => {
    if (!modeContoh && !profil) return;
    let aktif = true;
    setMemuatData(true);
    setGalat(false);
    (async () => {
      try {
        const hariIni = tanggalIsoHariIni();
        const wali = profil?.peran === "wali";
        // Nama santri untuk pencarian berasal dari respons ber-RLS ini,
        // bukan daftar global tambahan atau panggilan dengan hak admin.
        const [daftar, setoran, catatan, hasilSemester, olahraga] =
          await Promise.all([
            ambilDaftarSantri(),
            ambilSetoranTerakhir(100),
            ambilCatatanTerbaru(50),
            ambilSemesterAdmin().catch(() => null),
            wali ? Promise.resolve(null) : ambilDaftarSesi().catch(() => null),
          ]);
        if (!aktif) return;
        if (
          !modeContoh &&
          (daftar.sumberContoh ||
            catatan.sumberContoh ||
            setoran.sumber !== "supabase")
        ) {
          throw new Error("Data produksi belum tersedia");
        }
        setSantri(daftar.data);
        const pekan = rentangPekanBerjalan();
        const olahragaPekanIni =
          olahraga?.data.filter(
            (s) => s.tanggal >= pekan.mulai && s.tanggal <= pekan.selesai,
          ).length ?? 0;
        let kehadiran = 0;
        if (wali) {
          const riwayat = await Promise.all(
            daftar.data.map((s) => ambilRiwayatKehadiranSantri(s.id)),
          );
          if (!aktif) return;
          kehadiran = riwayat.reduce((jumlah, r) => jumlah + r.data.length, 0);
          const anak: Record<string, { kehadiran: number; setoran: number }> =
            {};
          daftar.data.forEach((s, i) => {
            anak[s.id] = {
              kehadiran: riwayat[i]?.data.length ?? 0,
              setoran: setoran.data.filter((x) => x.santriId === s.id).length,
            };
          });
          setRingkasanAnak(anak);
        } else {
          const [hifzh, diniyyah] = await Promise.all([
            ambilKehadiran(hariIni, "hifzh"),
            ambilKehadiran(hariIni, "diniyyah"),
          ]);
          kehadiran = hifzh.data.length + diniyyah.data.length;
        }
        if (!aktif) return;
        setSetoranTerbaru(setoran.data.slice(0, 4));
        setCatatanTerbaru(catatan.data[0] ?? null);
        setStatistik({
          santri: daftar.data.length,
          kehadiran,
          setoran: wali
            ? setoran.data.length
            : setoran.data.filter((s) => s.tanggalMasehi === hariIni).length,
          catatan: wali
            ? catatan.data.length
            : catatan.data.filter((c) => c.tanggal === hariIni).length,
          olahraga: olahragaPekanIni,
        });
        setSemester(
          hasilSemester?.data.find((s) => statusSemester(s) === "berjalan") ??
            null,
        );
      } catch {
        if (aktif) {
          setStatistik(null);
          setGalat(true);
        }
      } finally {
        if (aktif) setMemuatData(false);
      }
    })();
    return () => {
      aktif = false;
    };
  }, [modeContoh, profil, percobaan]);

  const identitas = modeContoh
    ? { nama: "Pengguna Contoh", peran: "admin" as const }
    : profil;
  const wali = identitas?.peran === "wali";

  return (
    <BerandaMonitoring
      profil={identitas}
      memuatProfil={memuatProfil}
      memuatData={memuatData}
      modeContoh={modeContoh}
      statistik={statistik}
      santri={santri}
      galat={galat}
      onMuatUlang={() => setPercobaan((n) => n + 1)}
    >
      {wali && !memuatData && !galat && (
        <section aria-labelledby="judul-anak-beranda">
          <div className="beranda-kepala-seksi">
            <h2 id="judul-anak-beranda">Anak Saya</h2>
          </div>
          {santri.length === 0 ? (
            <div className="kartu">
              <h2>Belum ada anak tertaut</h2>
              <p>
                Hubungi admin pondok untuk menautkan akun ini ke data anak Anda.
              </p>
            </div>
          ) : (
            <div className="beranda-daftar-anak">
              {santri.map((s) => (
                <Link
                  className="baris-daftar"
                  key={s.id}
                  href={`/santri/${s.id}`}
                >
                  <AvatarInisial nama={s.nama} ukuran="kecil" />
                  <span className="baris-teks">
                    <strong className="baris-judul">{s.nama}</strong>
                    <span className="baris-ket">
                      {s.kelasNama} · {ringkasanAnak[s.id]?.setoran ?? 0}{" "}
                      setoran tercatat
                    </span>
                  </span>
                  <Ikon nama="chevron-kanan" ukuran={17} />
                </Link>
              ))}
            </div>
          )}
          {catatanTerbaru && (
            <div className="kartu beranda-catatan-anak">
              <span className="lencana lencana--netral">
                {LABEL_KATEGORI[catatanTerbaru.kategori]}
              </span>
              <p>{catatanTerbaru.isi}</p>
              <small>
                {catatanTerbaru.pelaporNama} ·{" "}
                {formatTanggal(catatanTerbaru.tanggal)}
              </small>
            </div>
          )}
        </section>
      )}

      {identitas?.peran === "pengajar_hifzh" && setoranTerbaru.length > 0 && (
        <section aria-labelledby="judul-setoran-terbaru">
          <div className="beranda-kepala-seksi">
            <h2 id="judul-setoran-terbaru">Setoran Terakhir</h2>
            <Link href="/hifzh?tab=riwayat">
              Lihat semua <Ikon nama="chevron-kanan" ukuran={14} />
            </Link>
          </div>
          <div className="daftar-ringkas">
            {setoranTerbaru.map((s) => (
              <div key={s.id} className="baris-ringkas">
                <AvatarInisial nama={s.santriNama} ukuran="kecil" />
                <span className="baris-teks">
                  <strong className="baris-judul">{s.santriNama}</strong>
                  <span className="baris-ket">
                    {s.jenis} · {s.surat} {s.ayatDari}–{s.ayatSampai}
                  </span>
                </span>
                <span
                  className={`lencana lencana--${s.nilaiHuruf.toLowerCase()}`}
                >
                  {LABEL_NILAI_SETORAN[s.nilaiHuruf]}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {identitas && (
        <div className="beranda-meta">
          {semester && (
            <div className="beranda-semester">
              <Ikon nama="kalender" ukuran={18} />
              <div>
                <strong>
                  {semester.nama} · {semester.tahunAjaran}
                </strong>
                <span>
                  {formatTanggal(semester.tanggalMulai)} –{" "}
                  {formatTanggal(semester.tanggalSelesai)}
                </span>
              </div>
            </div>
          )}
          <p>{formatHijriahRingkas()}</p>
        </div>
      )}
    </BerandaMonitoring>
  );
}
