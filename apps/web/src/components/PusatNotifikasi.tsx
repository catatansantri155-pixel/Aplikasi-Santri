"use client";
import { useEffect, useState } from "react";
import {
  ambilNotifikasi,
  bacaSemuaInformasi,
  NOTIFIKASI_BERUBAH,
  type Notifikasi,
} from "@/lib/data/notifikasi";
import { supabaseTerhubung } from "@/lib/data/santri";
import DaftarNotifikasi from "@/components/DaftarNotifikasi";
export default function PusatNotifikasi() {
  const [belum, setBelum] = useState(false),
    [halaman, setHalaman] = useState(0),
    [data, setData] = useState<Notifikasi[]>([]),
    [jumlah, setJumlah] = useState(0),
    [belumJumlah, setBelumJumlah] = useState(0),
    [memuat, setMemuat] = useState(true),
    [galat, setGalat] = useState(""),
    [pesan, setPesan] = useState(""),
    [ulang, setUlang] = useState(0),
    [menyimpan, setMenyimpan] = useState(false);
  useEffect(() => {
    let aktif = true;
    setMemuat(true);
    setGalat("");
    setData([]);
    ambilNotifikasi(belum, halaman)
      .then((r) => {
        if (aktif) {
          setData(r.data);
          setJumlah(r.jumlah);
          setBelumJumlah(r.belum);
          if (halaman > 0 && r.data.length === 0)
            setHalaman(Math.max(0, Math.ceil(r.jumlah / 20) - 1));
        }
      })
      .catch((e) => {
        if (aktif) setGalat(e.message);
      })
      .finally(() => {
        if (aktif) setMemuat(false);
      });
    return () => {
      aktif = false;
    };
  }, [belum, halaman, ulang]);
  useEffect(() => {
    const muat = () => {
      if (!document.hidden) setUlang((n) => n + 1);
    };
    const timer = window.setInterval(muat, 30000);
    document.addEventListener("visibilitychange", muat);
    window.addEventListener("focus", muat);
    window.addEventListener(NOTIFIKASI_BERUBAH, muat);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", muat);
      window.removeEventListener("focus", muat);
      window.removeEventListener(NOTIFIKASI_BERUBAH, muat);
    };
  }, []);
  async function semua() {
    setMenyimpan(true);
    setGalat("");
    setPesan("");
    try {
      await bacaSemuaInformasi();
      setPesan(
        "Notifikasi telah ditandai dibaca. Konfirmasi memahami tetap dilakukan satu per satu.",
      );
      setHalaman(0);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Status belum tersimpan.");
    } finally {
      setMenyimpan(false);
    }
  }
  return (
    <section className="pusat-notifikasi">
      <div className="notifikasi-kepala">
        <div>
          <h1 className="judul-halaman">Notifikasi</h1>
          <p className="subjudul">
            Informasi pondok yang ditujukan untuk akun Anda.
          </p>
        </div>
        <button
          type="button"
          className="tombol tombol-sekunder"
          onClick={() => void semua()}
          disabled={menyimpan || memuat || !belumJumlah || !supabaseTerhubung()}
        >
          {menyimpan ? "Menyimpan…" : "Tandai semua dibaca"}
        </button>
      </div>
      {!supabaseTerhubung() && (
        <p className="catatan-kaki">
          Mode contoh · notifikasi asli tersedia setelah layanan terhubung.
        </p>
      )}
      <div
        className="notifikasi-filter"
        role="group"
        aria-label="Filter notifikasi"
      >
        <button
          type="button"
          aria-pressed={!belum}
          onClick={() => {
            setBelum(false);
            setHalaman(0);
          }}
        >
          Semua
        </button>
        <button
          type="button"
          aria-pressed={belum}
          onClick={() => {
            setBelum(true);
            setHalaman(0);
          }}
        >
          Belum dibaca{!memuat && !galat ? ` (${belumJumlah})` : ""}
        </button>
        <button type="button" onClick={() => setUlang((n) => n + 1)}>
          Muat ulang
        </button>
      </div>
      {pesan && (
        <p role="status" className="pesan-sukses">
          {pesan}
        </p>
      )}
      {galat && (
        <p role="alert" className="pesan-galat">
          {galat}{" "}
          <button type="button" onClick={() => setUlang((n) => n + 1)}>
            Coba lagi
          </button>
        </p>
      )}
      {memuat ? (
        <p role="status">Memuat notifikasi…</p>
      ) : (
        !galat &&
        (data.length ? (
          <DaftarNotifikasi data={data} />
        ) : (
          <div className="informasi-kosong">
            <strong>
              {belum
                ? "Semua notifikasi sudah dibaca."
                : "Belum ada notifikasi."}
            </strong>
            <p>
              Pengumuman yang masih tayang dan sesuai penerima akan tampil di
              sini.
            </p>
          </div>
        ))
      )}
      {!memuat && !galat && jumlah > 20 && (
        <div className="informasi-paginasi">
          <button
            type="button"
            className="tombol tombol-sekunder"
            disabled={!halaman}
            onClick={() => setHalaman((n) => n - 1)}
          >
            Sebelumnya
          </button>
          <span>
            {halaman + 1} / {Math.ceil(jumlah / 20)}
          </span>
          <button
            type="button"
            className="tombol tombol-sekunder"
            disabled={(halaman + 1) * 20 >= jumlah}
            onClick={() => setHalaman((n) => n + 1)}
          >
            Berikutnya
          </button>
        </div>
      )}
    </section>
  );
}
