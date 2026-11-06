"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import FormPerizinan from "@/components/FormPerizinan";
import { ambilProfilLogin, type ProfilLogin } from "@/lib/sesi";
import {
  detailIzin,
  aksiIzin,
  bacaIzin,
  urlLampiran,
  type IzinDetail,
} from "@/lib/data/perizinan";
import {
  STATUS_IZIN,
  AKSI_IZIN,
  pilihanAksi,
  waktuIzin,
  type AksiIzin,
} from "@/lib/perizinan";
export default function DetailPerizinan({ id }: { id: string }) {
  const [d, setD] = useState<IzinDetail | null>(null),
    [p, setP] = useState<ProfilLogin | null>(null),
    [galat, setGalat] = useState(""),
    [muat, setMuat] = useState(true),
    [sibuk, setSibuk] = useState(false),
    [edit, setEdit] = useState(false),
    [aksi, setAksi] = useState<AksiIzin | null>(null),
    [catatan, setCatatan] = useState(""),
    [lampiran, setLampiran] = useState(""),
    [galatLampiran, setGalatLampiran] = useState("");
  const terkunci = useRef(false),
    generasi = useRef(0);
  const refresh = useCallback(async () => {
    const n = ++generasi.current;
    setMuat(true);
    setGalat("");
    try {
      const [v, profil] = await Promise.all([
        detailIzin(id),
        ambilProfilLogin(),
      ]);
      if (n !== generasi.current) return;
      setD(v);
      setP(profil);
      setAksi(null);
      setCatatan("");
      await bacaIzin(v.id, v.revisi).catch(() => {});
    } catch (e) {
      if (n === generasi.current) {
        setD(null);
        setGalat(
          e instanceof Error ? e.message : "Pengajuan belum dapat dimuat.",
        );
      }
    } finally {
      if (n === generasi.current) setMuat(false);
    }
  }, [id]);
  useEffect(() => {
    void refresh();
    return () => {
      generasi.current++;
    };
  }, [refresh]);
  useEffect(() => {
    setLampiran("");
    setGalatLampiran("");
  }, [d?.lampiran_path]);
  async function bukaLampiran() {
    if (!d?.lampiran_path) return;
    try {
      setLampiran(await urlLampiran(d.lampiran_path));
      setGalatLampiran("");
    } catch (e) {
      setGalatLampiran(
        e instanceof Error ? e.message : "Lampiran tidak dapat dimuat.",
      );
    }
  }
  async function proses() {
    if (!d || !aksi || terkunci.current) return;
    if (
      ["tolak", "perbaiki", "batalkan"].includes(aksi) &&
      catatan.trim().length < 5
    ) {
      setGalat("Tuliskan alasan minimal 5 karakter.");
      return;
    }
    terkunci.current = true;
    setSibuk(true);
    setGalat("");
    try {
      await aksiIzin(d.id, d.revisi, aksi, catatan);
      await refresh();
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Tindakan belum tersimpan.");
    } finally {
      terkunci.current = false;
      setSibuk(false);
    }
  }
  const bolehEdit =
    p?.peran === "wali" &&
    p.id === d?.pengaju_id &&
    ["menunggu", "perlu_perbaikan"].includes(d?.status ?? "");
  const daftar = d
    ? pilihanAksi(p?.peran ?? null, d.status, p?.id === d.pengaju_id)
    : [];
  return (
    <div className="izin-halaman">
      <Link className="izin-kembali" href="/perizinan">
        ← Semua pengajuan
      </Link>
      <h1 className="judul-halaman">Detail Perizinan</h1>
      {muat && <p role="status">Memuat pengajuan…</p>}
      {galat && (
        <p className="pesan-galat" role="alert">
          {galat}
        </p>
      )}
      {!muat && !d && <button onClick={refresh}>Coba lagi</button>}
      {d && (
        <>
          <section className="izin-panel izin-detail-kop">
            <div>
              <span className={`izin-status izin-${d.status}`}>
                {STATUS_IZIN[d.status]}
              </span>
              <h2>{d.santri_nama}</h2>
              <p>
                {d.kelas_nama} · Izin {d.jenis}
              </p>
            </div>
            <button
              className="tombol tombol-sekunder"
              disabled={muat || sibuk || edit}
              onClick={refresh}
            >
              Muat ulang
            </button>
            {d.status === "sedang_izin" &&
              new Date(d.rencana_kembali).getTime() < Date.now() && (
                <p className="izin-terlambat izin-lebar">
                  Melewati jadwal kembali. Hubungi wali dan pastikan keadaan
                  santri.
                </p>
              )}
          </section>
          {edit && bolehEdit ? (
            <FormPerizinan
              izin={d}
              onTutup={() => setEdit(false)}
              onSimpan={() => {
                setEdit(false);
                void refresh();
              }}
            />
          ) : (
            <div className="izin-detail-kisi">
              <section className="izin-panel">
                <h2>Rencana &amp; penjemput</h2>
                <dl className="izin-rincian">
                  {[
                    ["Rencana keluar", waktuIzin(d.rencana_keluar)],
                    ["Rencana kembali", waktuIzin(d.rencana_kembali)],
                    ["Keberangkatan aktual", waktuIzin(d.keluar_pada)],
                    ["Kepulangan aktual", waktuIzin(d.kembali_pada)],
                    ["Pengaju", d.pengaju_nama],
                    ["Penjemput", d.penjemput],
                    ["Hubungan", d.hubungan],
                    ["Kontak", d.kontak],
                    ["Tujuan", d.tujuan],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
                <h3>Alasan izin</h3>
                <p className="izin-teks">{d.alasan}</p>
                {d.catatan_petugas && (
                  <div className="izin-catatan">
                    <strong>Catatan terakhir</strong>
                    <p className="izin-teks">{d.catatan_petugas}</p>
                  </div>
                )}
                {d.lampiran_path && (
                  <div>
                    <button onClick={bukaLampiran}>
                      Buka / perbarui lampiran
                    </button>
                    {galatLampiran && <p role="alert">{galatLampiran}</p>}
                    {lampiran && (
                      <a href={lampiran} target="_blank" rel="noreferrer">
                        <img
                          className="izin-pratinjau"
                          src={lampiran}
                          alt="Lampiran pengajuan; ketuk untuk ukuran penuh"
                          onError={() => {
                            setLampiran("");
                            setGalatLampiran(
                              "Tautan sudah kedaluwarsa. Buka ulang lampiran.",
                            );
                          }}
                        />
                      </a>
                    )}
                  </div>
                )}
              </section>
              <section className="izin-panel">
                <h2>Proses pengajuan</h2>
                <p className="izin-petunjuk">
                  Persetujuan, keberangkatan, dan kepulangan dicatat terpisah
                  oleh petugas. Kehadiran tidak berubah otomatis.
                </p>
                {bolehEdit && (
                  <button
                    className="tombol tombol-sekunder"
                    disabled={muat || sibuk}
                    onClick={() => {
                      setAksi(null);
                      setEdit(true);
                    }}
                  >
                    Ubah pengajuan
                  </button>
                )}
                <div className="izin-tindakan">
                  {daftar.map((a) => (
                    <button
                      disabled={muat || sibuk}
                      className={
                        a === "setujui" || a === "kembali"
                          ? "tombol-utama"
                          : "tombol-sekunder"
                      }
                      key={a}
                      onClick={() => {
                        setAksi(a);
                        setCatatan("");
                        setGalat("");
                      }}
                    >
                      {AKSI_IZIN[a]}
                    </button>
                  ))}
                </div>
                {aksi && (
                  <div className="izin-konfirmasi">
                    <h3>{AKSI_IZIN[aksi]}?</h3>
                    <p>
                      {aksi === "keluar"
                        ? "Waktu keberangkatan aktual akan dicatat sekarang. Pastikan santri benar-benar berangkat."
                        : aksi === "kembali"
                          ? "Waktu kepulangan aktual akan dicatat sekarang. Pastikan santri sudah tiba di pondok."
                          : "Tindakan ini dicatat dalam riwayat dan diberitahukan kepada penerima terkait."}
                    </p>
                    <label>
                      Catatan{" "}
                      {["tolak", "perbaiki", "batalkan"].includes(aksi)
                        ? "(wajib)"
                        : "(opsional)"}
                      <textarea
                        maxLength={2000}
                        rows={3}
                        value={catatan}
                        onChange={(e) => setCatatan(e.target.value)}
                        disabled={sibuk}
                      />
                    </label>
                    <div className="izin-tindakan">
                      <button
                        className="tombol tombol-utama"
                        disabled={sibuk || muat}
                        onClick={proses}
                      >
                        {sibuk ? "Menyimpan…" : "Ya, lanjutkan"}
                      </button>
                      <button disabled={sibuk} onClick={() => setAksi(null)}>
                        Batal
                      </button>
                    </div>
                  </div>
                )}
                {!daftar.length && (
                  <p>
                    Tidak ada tindakan yang perlu Anda lakukan pada status ini.
                  </p>
                )}
                <h3>Riwayat</h3>
                <ol className="izin-lini">
                  {d.log.map((l) => (
                    <li key={l.id}>
                      <strong>{STATUS_IZIN[l.status_ke]}</strong>
                      <span>
                        {l.pelaku_nama} · {waktuIzin(l.waktu)}
                      </span>
                      {l.catatan && <p className="izin-teks">{l.catatan}</p>}
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
