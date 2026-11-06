"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import KopLayanan from "@/components/KopLayanan";
import { Ikon } from "@/components/Ikon";
import FilterPeriode from "@/components/FilterPeriode";
import FormTagihan from "@/components/FormTagihan";
import ProgresKeuangan from "@/components/ProgresKeuangan";
import { ambilProfilLogin, type ProfilLogin } from "@/lib/sesi";
import { supabaseTerhubung } from "@/lib/data/santri";
import { daftarTagihan, type DaftarTagihan } from "@/lib/data/keuangan";
import {
  rupiah,
  bulanTagihan,
  tanggalKeuangan,
  STATUS_TAGIHAN,
  selCsv,
} from "@/lib/keuangan";
import {
  SEMUA_PERIODE,
  type FilterPeriode as Periode,
} from "@/lib/filter-periode";
export default function PusatKeuangan() {
  const [profil, setProfil] = useState<ProfilLogin | null>(null),
    [d, setD] = useState<DaftarTagihan | null>(null),
    [muat, setMuat] = useState(true),
    [galat, setGalat] = useState(""),
    [form, setForm] = useState(false),
    [status, setStatus] = useState("semua"),
    [periode, setPeriode] = useState<Periode>(SEMUA_PERIODE),
    [cari, setCari] = useState(""),
    [kata, setKata] = useState(""),
    [hal, setHal] = useState(0),
    [ulang, setUlang] = useState(0),
    [pesan, setPesan] = useState("");
  useEffect(() => {
    let hidup = true;
    ambilProfilLogin()
      .then((p) => {
        if (hidup) setProfil(p);
      })
      .catch(() => {});
    return () => {
      hidup = false;
    };
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      setKata(cari);
      setHal(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [cari]);
  useEffect(() => {
    let hidup = true;
    setMuat(true);
    setGalat("");
    setD(null);
    if (!supabaseTerhubung()) {
      setMuat(false);
      return;
    }
    daftarTagihan(status, periode, kata, hal)
      .then((v) => {
        if (hidup) setD(v);
      })
      .catch((e) => {
        if (hidup) setGalat(e.message);
      })
      .finally(() => {
        if (hidup) setMuat(false);
      });
    return () => {
      hidup = false;
    };
  }, [status, periode, kata, hal, ulang]);
  function unduh() {
    if (!d) return;
    const rows = [
      [
        "Santri",
        "Kelas",
        "Tagihan",
        "Periode",
        "Jatuh tempo",
        "Nominal",
        "Diterima",
        "Menunggu verifikasi",
        "Sisa",
        "Status",
      ],
      ...d.data.map((t) => [
        t.santri_nama,
        t.kelas_nama,
        t.judul,
        t.periode,
        t.jatuh_tempo,
        t.nominal,
        t.terbayar,
        t.menunggu,
        t.sisa,
        STATUS_TAGIHAN[t.status_bayar],
      ]),
    ];
    const blob = new Blob(
      ["\uFEFF" + rows.map((r) => r.map(selCsv).join(",")).join("\r\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `tagihan-halaman-${hal + 1}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="izin-halaman spp-halaman">
      <KopLayanan
        judul="Keuangan Santri"
        kategori="SPP & pembayaran"
        keterangan="Kelola tagihan, konfirmasi pembayaran, dan pantau pelunasan."
        gambar="/images/fitur/keuangan.webp"
        aksi={
          profil?.peran === "admin" ? (
            <button
              className="tombol tombol-utama"
              onClick={() => setForm(!form)}
            >
              <Ikon nama={form ? "tutup" : "catatan"} ukuran={18} />
              {form ? "Tutup formulir" : "Terbitkan tagihan"}
            </button>
          ) : undefined
        }
      />
      {form && (
        <FormTagihan
          onTutup={() => setForm(false)}
          onSimpan={(r) => {
            setForm(false);
            setPesan(
              `${r.dibuat} tagihan diterbitkan. ${r.dilewati} dilewati karena SPP bulan yang sama sudah ada.`,
            );
            setHal(0);
            setUlang((v) => v + 1);
          }}
        />
      )}
      {pesan && (
        <p className="spp-pesan" role="status">
          {pesan}
        </p>
      )}
      {!supabaseTerhubung() ? (
        <section className="izin-panel">
          <h2>Belum ada tagihan</h2>
          <p>
            Tagihan dan pembayaran tersedia setelah aplikasi terhubung ke
            server.
          </p>
        </section>
      ) : (
        <>
          {d && (
            <>
              <div className="spp-kpi">
                {[
                  ["Total tagihan aktif", d.ringkasan.tagihan],
                  ["Pembayaran diterima", d.ringkasan.terbayar],
                  ["Sisa tagihan", d.ringkasan.sisa],
                  ["Menunggu verifikasi", d.ringkasan.menunggu],
                ].map(([k, n]) => (
                  <div key={k}>
                    <span>{k}</span>
                    <strong>{rupiah(Number(n))}</strong>
                  </div>
                ))}
              </div>
              <section className="izin-panel">
                <ProgresKeuangan
                  total={d.ringkasan.tagihan}
                  terbayar={d.ringkasan.terbayar}
                />
                <p className="izin-petunjuk">
                  Ringkasan mengikuti jatuh tempo dan pencarian. Bukti yang
                  belum diverifikasi belum mengurangi sisa tagihan.
                </p>
              </section>
            </>
          )}
          <section className="izin-panel">
            <div className="layanan-bilah">
              <h2>Daftar tagihan</h2>
              <button
                className="layanan-refresh"
                type="button"
                aria-label="Muat ulang tagihan"
                title="Muat ulang tagihan"
                disabled={muat}
                onClick={() => setUlang((v) => v + 1)}
              >
                <Ikon nama="muat-ulang" ukuran={19} />
              </button>
            </div>
            <div className="izin-filter">
              <label className="layanan-pencarian">
                Cari santri / tagihan
                <input
                  type="search"
                  value={cari}
                  maxLength={100}
                  onChange={(e) => setCari(e.target.value)}
                  placeholder="Nama santri, kelas, atau judul"
                />
              </label>
              <label>
                Status
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setHal(0);
                  }}
                >
                  <option value="semua">Semua status</option>
                  {Object.entries(STATUS_TAGIHAN).map(([k, v]) => (
                    <option value={k} key={k}>
                      {v}
                    </option>
                  ))}
                  <option value="menunggu">Menunggu verifikasi</option>
                  <option value="terlambat">Lewat jatuh tempo</option>
                </select>
              </label>
              <FilterPeriode
                nilai={periode}
                onUbah={(v) => {
                  setPeriode(v);
                  setHal(0);
                }}
              />
            </div>
            <p className="izin-petunjuk">
              Filter tanggal / bulan / tahun berdasarkan jatuh tempo tagihan ·
              WIB
            </p>
            {muat && <p role="status">Memuat tagihan…</p>}
            {galat && (
              <p role="alert" className="pesan-galat">
                {galat}
              </p>
            )}
            {d && (
              <>
                <div className="spp-hasil">
                  <span>{d.jumlah} tagihan ditemukan</span>
                  {profil?.peran === "admin" && d.data.length > 0 && (
                    <button className="tombol tombol-sekunder" onClick={unduh}>
                      CSV halaman ini
                    </button>
                  )}
                </div>
                <div className="spp-daftar">
                  <div className="spp-tabel-kop" aria-hidden="true">
                    <span>Santri / tagihan</span>
                    <span>Jatuh tempo</span>
                    <span>Nominal</span>
                    <span>Sisa</span>
                    <span>Status</span>
                  </div>
                  {d.data.map((t) => (
                    <Link
                      className="spp-tagihan"
                      key={t.id}
                      href={`/keuangan/${t.id}`}
                    >
                      <div>
                        <strong>{t.santri_nama}</strong>
                        <p>
                          {t.judul} · {bulanTagihan(t.periode)}
                        </p>
                        <small>{t.kelas_nama}</small>
                      </div>
                      <div>
                        <small className="spp-label-mobile">Jatuh tempo</small>
                        <span>{tanggalKeuangan(t.jatuh_tempo)}</span>
                        {t.terlambat && (
                          <small className="spp-lewat">Lewat jatuh tempo</small>
                        )}
                      </div>
                      <div>
                        <small className="spp-label-mobile">Nominal</small>
                        <strong>{rupiah(t.nominal)}</strong>
                      </div>
                      <div>
                        <small className="spp-label-mobile">Sisa</small>
                        <strong>{rupiah(t.sisa)}</strong>
                        {t.menunggu > 0 && (
                          <small>Verifikasi {rupiah(t.menunggu)}</small>
                        )}
                      </div>
                      <span className={`spp-status spp-${t.status_bayar}`}>
                        {STATUS_TAGIHAN[t.status_bayar]}
                      </span>
                    </Link>
                  ))}
                </div>
                {!d.jumlah && (
                  <div className="izin-kosong">
                    <Image
                      src="/images/fitur/keuangan.webp"
                      alt=""
                      width={100}
                      height={100}
                    />
                    <h2>Belum ada tagihan pada pilihan ini</h2>
                    <p>
                      {profil?.peran === "admin"
                        ? "Terbitkan tagihan untuk santri saat diperlukan."
                        : "Tagihan anak yang tertaut akan tampil di sini."}
                    </p>
                  </div>
                )}
                {d.jumlah > 20 && (
                  <nav className="izin-paginasi" aria-label="Halaman tagihan">
                    <button
                      disabled={hal === 0}
                      onClick={() => setHal((v) => v - 1)}
                    >
                      Sebelumnya
                    </button>
                    <span>
                      {hal + 1} / {Math.ceil(d.jumlah / 20)}
                    </span>
                    <button
                      disabled={(hal + 1) * 20 >= d.jumlah}
                      onClick={() => setHal((v) => v + 1)}
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
