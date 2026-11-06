"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import FormPembayaran from "@/components/FormPembayaran";
import ProgresKeuangan from "@/components/ProgresKeuangan";
import { ambilProfilLogin, type ProfilLogin } from "@/lib/sesi";
import {
  detailTagihan,
  aksiKeuangan,
  bacaKeuangan,
  urlBukti,
  type DetailTagihan,
} from "@/lib/data/keuangan";
import {
  STATUS_TAGIHAN,
  STATUS_PEMBAYARAN,
  JENIS_TAGIHAN,
  LABEL_AKSI,
  rupiah,
  tanggalKeuangan,
  bulanTagihan,
  type AksiKeuangan,
} from "@/lib/keuangan";
import { waktuIzin } from "@/lib/perizinan";
function Bukti({ path }: { path: string }) {
  const [url, setUrl] = useState(""),
    [pesan, setPesan] = useState("");
  async function buka() {
    setPesan("");
    try {
      setUrl(await urlBukti(path));
    } catch (e) {
      setPesan(e instanceof Error ? e.message : "Bukti gagal dibuka.");
    }
  }
  return (
    <div>
      <button className="tombol tombol-sekunder" onClick={buka}>
        Buka / perbarui bukti
      </button>
      {pesan && <p role="alert">{pesan}</p>}
      {url && (
        <a href={url} target="_blank" rel="noreferrer">
          <img
            src={url}
            className="izin-pratinjau"
            alt="Bukti pembayaran; ketuk untuk ukuran penuh"
            onError={() => {
              setUrl("");
              setPesan("Tautan kedaluwarsa. Buka ulang bukti.");
            }}
          />
        </a>
      )}
    </div>
  );
}
export default function DetailKeuangan({ id }: { id: string }) {
  const [d, setD] = useState<DetailTagihan | null>(null),
    [profil, setProfil] = useState<ProfilLogin | null>(null),
    [muat, setMuat] = useState(true),
    [galat, setGalat] = useState(""),
    [sibuk, setSibuk] = useState(false),
    [form, setForm] = useState(false),
    [pilih, setPilih] = useState<{
      aksi: AksiKeuangan;
      bayar: string | null;
      nominal?: number;
    } | null>(null),
    [catatan, setCatatan] = useState(""),
    [pesan, setPesan] = useState("");
  const generasi = useRef(0),
    kunci = useRef(false);
  const refresh = useCallback(async () => {
    const n = ++generasi.current;
    setMuat(true);
    setGalat("");
    try {
      const [v, p] = await Promise.all([detailTagihan(id), ambilProfilLogin()]);
      if (n !== generasi.current) return;
      setD(v);
      setProfil(p);
      setPilih(null);
      setCatatan("");
      await bacaKeuangan(v.id, v.revisi).catch(() => {});
    } catch (e) {
      if (n === generasi.current) {
        setD(null);
        setGalat(
          e instanceof Error ? e.message : "Tagihan belum dapat dimuat.",
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
  const admin = profil?.peran === "admin";
  function pilihAksi(
    aksi: AksiKeuangan,
    bayar: string | null = null,
    nominal?: number,
  ) {
    setPilih({ aksi, bayar, nominal });
    setCatatan("");
    setGalat("");
    setForm(false);
  }
  async function proses() {
    if (!d || !pilih || kunci.current) return;
    if (pilih.aksi !== "terima" && catatan.trim().length < 5) {
      setGalat("Alasan wajib minimal 5 karakter.");
      return;
    }
    kunci.current = true;
    setSibuk(true);
    setGalat("");
    try {
      await aksiKeuangan(d.id, d.revisi, pilih.aksi, pilih.bayar, catatan);
      setPesan("Perubahan tersimpan dan tercatat dalam riwayat.");
      await refresh();
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Tindakan belum tersimpan.");
    } finally {
      kunci.current = false;
      setSibuk(false);
    }
  }
  return (
    <div className="izin-halaman spp-halaman">
      <Link href="/keuangan" className="izin-kembali">
        ← Semua tagihan
      </Link>
      <h1 className="judul-halaman">Detail Tagihan</h1>
      {muat && <p role="status">Memuat tagihan…</p>}
      {galat && (
        <p className="pesan-galat" role="alert">
          {galat}
        </p>
      )}
      {pesan && (
        <p className="spp-pesan" role="status">
          {pesan}
        </p>
      )}
      {!muat && !d && <button onClick={refresh}>Coba lagi</button>}
      {d && (
        <>
          <section className="izin-panel">
            <div className="spp-detail-kop">
              <div>
                <span className={`spp-status spp-${d.status_bayar}`}>
                  {STATUS_TAGIHAN[d.status_bayar]}
                </span>
                <h2>{d.judul}</h2>
                <p>
                  {d.santri_nama} · {d.kelas_nama}
                </p>
                <small>
                  {JENIS_TAGIHAN[d.jenis]} · {bulanTagihan(d.periode)}
                </small>
              </div>
              <div>
                <small>Sisa tagihan</small>
                <strong className="spp-angka-besar">{rupiah(d.sisa)}</strong>
                <span>Jatuh tempo {tanggalKeuangan(d.jatuh_tempo)}</span>
              </div>
            </div>
            {d.terlambat && (
              <p className="izin-terlambat">
                Tagihan melewati jatuh tempo. Hubungi admin jika membutuhkan
                penyesuaian pembayaran.
              </p>
            )}
            <dl className="spp-total">
              <div>
                <dt>Nominal tagihan</dt>
                <dd>{rupiah(d.nominal)}</dd>
              </div>
              <div>
                <dt>Sudah diterima</dt>
                <dd>{rupiah(d.terbayar)}</dd>
              </div>
              <div>
                <dt>Menunggu verifikasi</dt>
                <dd>{rupiah(d.menunggu)}</dd>
              </div>
            </dl>
            {d.status === "aktif" && (
              <ProgresKeuangan total={d.nominal} terbayar={d.terbayar} />
            )}
            <div className="spp-instruksi">
              <h3>Instruksi pembayaran</h3>
              <p className="izin-teks">
                {d.catatan ||
                  "Hubungi admin pondok untuk rekening resmi atau cara pembayaran. Periksa nama penerima sebelum membayar."}
              </p>
            </div>
            <div className="izin-tindakan">
              {d.status === "aktif" && d.sisa > d.menunggu && (
                <button
                  className="tombol tombol-utama"
                  disabled={muat || sibuk}
                  onClick={() => {
                    setForm(!form);
                    setPilih(null);
                  }}
                >
                  {form
                    ? "Tutup formulir"
                    : admin
                      ? "+ Catat pembayaran"
                      : "Kirim bukti pembayaran"}
                </button>
              )}
              <button
                className="tombol tombol-sekunder"
                disabled={muat || sibuk || form}
                onClick={refresh}
              >
                Muat ulang
              </button>
              {admin &&
                d.status === "aktif" &&
                d.terbayar === 0 &&
                d.menunggu === 0 && (
                  <button
                    className="spp-bahaya"
                    disabled={muat || sibuk}
                    onClick={() => pilihAksi("batalkan_tagihan")}
                  >
                    Batalkan tagihan
                  </button>
                )}
            </div>
            <p className="izin-petunjuk">Referensi tagihan: {d.id}</p>
          </section>
          {form && (
            <FormPembayaran
              tagihan={d}
              wali={!admin}
              onTutup={() => setForm(false)}
              onSimpan={() => {
                setForm(false);
                setPesan(
                  admin
                    ? "Pembayaran diterima telah dicatat."
                    : "Bukti terkirim. Menunggu verifikasi admin.",
                );
                void refresh();
              }}
            />
          )}
          {pilih && (
            <section className="izin-panel spp-konfirmasi">
              <h2>{LABEL_AKSI[pilih.aksi]}?</h2>
              {pilih.nominal && <strong>{rupiah(pilih.nominal)}</strong>}
              <p>
                {pilih.aksi === "terima"
                  ? "Pastikan dana benar-benar sudah diterima. Sisa tagihan akan berkurang setelah dikonfirmasi."
                  : pilih.aksi === "koreksi"
                    ? "Pembayaran yang sudah diterima akan ditandai dibatalkan dan sisa tagihan bertambah kembali. Ini hanya koreksi catatan, bukan pengembalian uang otomatis."
                    : "Tindakan dicatat dalam riwayat dan diberitahukan kepada akun terkait."}
              </p>
              <label>
                Alasan / catatan{" "}
                {pilih.aksi === "terima" ? "(opsional)" : "(wajib)"}
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={catatan}
                  disabled={sibuk}
                  onChange={(e) => setCatatan(e.target.value)}
                />
              </label>
              <div className="izin-tindakan">
                <button
                  className="tombol tombol-utama"
                  disabled={muat || sibuk}
                  onClick={proses}
                >
                  {sibuk ? "Menyimpan…" : "Ya, lanjutkan"}
                </button>
                <button disabled={sibuk} onClick={() => setPilih(null)}>
                  Batal
                </button>
              </div>
            </section>
          )}
          <div className="spp-detail-kisi">
            <section className="izin-panel">
              <h2>Riwayat pembayaran</h2>
              <p className="izin-petunjuk">
                Hanya pembayaran berstatus Diterima yang mengurangi tagihan.
              </p>
              {!d.pembayaran.length && (
                <p>Belum ada pembayaran yang dicatat.</p>
              )}
              <div className="spp-pembayaran-daftar">
                {d.pembayaran.map((b) => (
                  <article className="spp-pembayaran" key={b.id}>
                    <div className="izin-item-kop">
                      <strong>{rupiah(b.nominal)}</strong>
                      <span className={`spp-status spp-${b.status}`}>
                        {STATUS_PEMBAYARAN[b.status]}
                      </span>
                    </div>
                    <p>
                      {tanggalKeuangan(b.tanggal_bayar)} ·{" "}
                      {b.metode === "transfer" ? "Transfer" : "Tunai"}
                    </p>
                    <dl className="izin-rincian">
                      <div>
                        <dt>Pembayar</dt>
                        <dd>{b.pengirim}</dd>
                      </div>
                      <div>
                        <dt>Diajukan oleh</dt>
                        <dd>{b.pengaju_nama}</dd>
                      </div>
                    </dl>
                    {b.catatan && <p className="izin-teks">{b.catatan}</p>}
                    {b.bukti_path && <Bukti path={b.bukti_path} />}
                    <small>Referensi: {b.id}</small>
                    {b.pemeriksa_nama && (
                      <p className="izin-petunjuk">
                        {b.pemeriksa_nama} · {waktuIzin(b.diperiksa_pada)}
                      </p>
                    )}
                    {b.catatan_verifikasi && (
                      <p className="izin-teks spp-pesan">
                        {b.catatan_verifikasi}
                      </p>
                    )}
                    {d.status === "aktif" && (
                      <div className="izin-tindakan">
                        {admin && b.status === "menunggu" && (
                          <>
                            <button
                              disabled={sibuk || muat}
                              className="tombol tombol-utama"
                              onClick={() =>
                                pilihAksi("terima", b.id, b.nominal)
                              }
                            >
                              Terima
                            </button>
                            <button
                              disabled={sibuk || muat}
                              onClick={() =>
                                pilihAksi("tolak", b.id, b.nominal)
                              }
                            >
                              Tolak
                            </button>
                          </>
                        )}
                        {b.status === "menunggu" &&
                          (admin || b.pengaju_id === profil?.id) && (
                            <button
                              disabled={sibuk || muat}
                              onClick={() =>
                                pilihAksi("tarik", b.id, b.nominal)
                              }
                            >
                              Tarik pengajuan
                            </button>
                          )}
                        {admin && b.status === "diterima" && (
                          <button
                            disabled={sibuk || muat}
                            className="spp-bahaya"
                            onClick={() =>
                              pilihAksi("koreksi", b.id, b.nominal)
                            }
                          >
                            Koreksi pembayaran
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
            <section className="izin-panel">
              <h2>Aktivitas tagihan</h2>
              <ol className="izin-lini">
                {d.log.map((l) => (
                  <li key={l.id}>
                    <strong>{l.aksi}</strong>
                    <span>
                      {l.pelaku_nama} · {waktuIzin(l.waktu)}
                    </span>
                    {l.catatan && <p className="izin-teks">{l.catatan}</p>}
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
