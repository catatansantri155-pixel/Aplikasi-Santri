"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import KopLayanan from "@/components/KopLayanan";
import { Ikon } from "@/components/Ikon";
import FilterPeriode from "@/components/FilterPeriode";
import FormPerizinan from "@/components/FormPerizinan";
import { ambilProfilLogin, type ProfilLogin } from "@/lib/sesi";
import { supabaseTerhubung } from "@/lib/data/santri";
import { daftarIzin, type DaftarIzin } from "@/lib/data/perizinan";
import { STATUS_IZIN, waktuIzin } from "@/lib/perizinan";
import {
  SEMUA_PERIODE,
  type FilterPeriode as Periode,
} from "@/lib/filter-periode";
export default function PusatPerizinan() {
  const [profil, setProfil] = useState<ProfilLogin | null>(null),
    [hasil, setHasil] = useState<DaftarIzin | null>(null),
    [galat, setGalat] = useState(""),
    [muat, setMuat] = useState(true),
    [form, setForm] = useState(false),
    [status, setStatus] = useState("semua"),
    [periode, setPeriode] = useState<Periode>(SEMUA_PERIODE),
    [halaman, setHalaman] = useState(0),
    [ulang, setUlang] = useState(0);
  useEffect(() => {
    let aktif = true;
    ambilProfilLogin()
      .then((p) => {
        if (aktif) setProfil(p);
      })
      .catch(() => {});
    return () => {
      aktif = false;
    };
  }, []);
  const refresh = useCallback(() => setUlang((v) => v + 1), []);
  useEffect(() => {
    let aktif = true;
    setMuat(true);
    setGalat("");
    setHasil(null);
    if (!supabaseTerhubung()) {
      setMuat(false);
      return;
    }
    daftarIzin(status, periode, halaman)
      .then((d) => {
        if (aktif) setHasil(d);
      })
      .catch((e) => {
        if (aktif) setGalat(e.message);
      })
      .finally(() => {
        if (aktif) setMuat(false);
      });
    return () => {
      aktif = false;
    };
  }, [status, periode, halaman, ulang]);
  return (
    <div className="izin-halaman">
      <KopLayanan
        judul="Perizinan Santri"
        kategori="Layanan pondok"
        keterangan="Ajukan izin dan pantau keberangkatan hingga kepulangan santri."
        gambar="/images/fitur/perizinan.webp"
        aksi={
          profil?.peran === "wali" ? (
            <button
              className="tombol tombol-utama"
              onClick={() => setForm(!form)}
            >
              <Ikon nama={form ? "tutup" : "pena"} ukuran={18} />
              {form ? "Tutup formulir" : "Ajukan izin"}
            </button>
          ) : undefined
        }
      />
      {form && (
        <FormPerizinan
          onTutup={() => setForm(false)}
          onSimpan={() => {
            setForm(false);
            refresh();
          }}
        />
      )}
      {!supabaseTerhubung() ? (
        <section className="izin-panel">
          <h2>Belum ada pengajuan</h2>
          <p>
            Pengajuan dan riwayat izin tersedia setelah aplikasi terhubung ke
            server.
          </p>
        </section>
      ) : (
        <>
          {hasil && (
            <div className="izin-statistik">
              {(
                [
                  ["Menunggu", hasil.ringkasan.menunggu],
                  ["Disetujui", hasil.ringkasan.disetujui],
                  ["Sedang izin", hasil.ringkasan.sedang_izin],
                  ["Lewat jadwal", hasil.ringkasan.terlambat],
                ] as const
              ).map(([label, n]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{n}</strong>
                </div>
              ))}
            </div>
          )}
          <section className="izin-panel">
            <div className="layanan-bilah">
              <h2>Daftar pengajuan</h2>
              <button
                className="layanan-refresh"
                type="button"
                aria-label="Muat ulang pengajuan"
                title="Muat ulang pengajuan"
                disabled={muat}
                onClick={refresh}
              >
                <Ikon nama="muat-ulang" ukuran={19} />
              </button>
            </div>
            <div className="izin-filter">
              <label>
                Status
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setHalaman(0);
                  }}
                >
                  <option value="semua">Semua status</option>
                  {Object.entries(STATUS_IZIN).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                  <option value="terlambat">Lewat jadwal kembali</option>
                </select>
              </label>
              <FilterPeriode
                nilai={periode}
                onUbah={(v) => {
                  setPeriode(v);
                  setHalaman(0);
                }}
              />
            </div>
            <p className="izin-petunjuk">
              Filter berdasarkan rencana keluar · Waktu Indonesia Barat
            </p>
            {muat && <p role="status">Memuat pengajuan…</p>}
            {galat && (
              <p className="pesan-galat" role="alert">
                {galat}
              </p>
            )}
            {hasil && (
              <>
                <p>{hasil.jumlah} pengajuan ditemukan</p>
                <div className="izin-daftar">
                  {hasil.data.map((i) => (
                    <Link
                      className="izin-item"
                      href={`/perizinan/${i.id}`}
                      key={i.id}
                    >
                      <div className="izin-item-kop">
                        <strong>{i.santri_nama}</strong>
                        <span className={`izin-status izin-${i.status}`}>
                          {STATUS_IZIN[i.status]}
                        </span>
                      </div>
                      <p>
                        {i.kelas_nama} ·{" "}
                        {i.jenis.charAt(0).toUpperCase() + i.jenis.slice(1)}
                      </p>
                      <dl>
                        <div>
                          <dt>Rencana keluar</dt>
                          <dd>{waktuIzin(i.rencana_keluar)}</dd>
                        </div>
                        <div>
                          <dt>Rencana kembali</dt>
                          <dd>{waktuIzin(i.rencana_kembali)}</dd>
                        </div>
                      </dl>
                      {i.terlambat && (
                        <p className="izin-terlambat">
                          Melewati jadwal kembali · perlu tindak lanjut
                        </p>
                      )}
                      <span className="izin-buka">Lihat pengajuan →</span>
                    </Link>
                  ))}
                </div>
                {!hasil.jumlah && (
                  <div className="izin-kosong">
                    <Image
                      src="/images/fitur/perizinan.webp"
                      alt=""
                      width={100}
                      height={100}
                    />
                    <h2>Belum ada izin pada pilihan ini</h2>
                    <p>
                      {profil?.peran === "wali"
                        ? "Ajukan izin untuk anak Anda saat diperlukan."
                        : "Pengajuan wali yang sesuai filter akan tampil di sini."}
                    </p>
                  </div>
                )}
                {hasil.jumlah > 20 && (
                  <nav className="izin-paginasi" aria-label="Halaman pengajuan">
                    <button
                      disabled={halaman === 0}
                      onClick={() => setHalaman((v) => v - 1)}
                    >
                      Sebelumnya
                    </button>
                    <span>
                      {halaman + 1} / {Math.ceil(hasil.jumlah / 20)}
                    </span>
                    <button
                      disabled={(halaman + 1) * 20 >= hasil.jumlah}
                      onClick={() => setHalaman((v) => v + 1)}
                    >
                      Berikutnya
                    </button>
                  </nav>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
