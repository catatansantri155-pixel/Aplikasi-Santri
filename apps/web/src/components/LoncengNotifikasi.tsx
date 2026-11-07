"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Ikon } from "@/components/Ikon";
import DaftarNotifikasi from "@/components/DaftarNotifikasi";
import {
  ambilNotifikasi,
  jumlahBelumDibaca,
  labelJumlah,
  NOTIFIKASI_BERUBAH,
  type Notifikasi,
} from "@/lib/data/notifikasi";
export default function LoncengNotifikasi() {
  const pathname = usePathname(),
    router = useRouter();
  const [jumlah, setJumlah] = useState<number | null>(null),
    [buka, setBuka] = useState(false),
    [baris, setBaris] = useState<Notifikasi[]>([]),
    [memuat, setMemuat] = useState(false),
    [galat, setGalat] = useState(""),
    [ulang, setUlang] = useState(0);
  const wadah = useRef<HTMLDivElement>(null),
    tombol = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let aktif = true,
      urutan = 0;
    setBuka(false);
    setJumlah(null);
    async function muat() {
      if (document.hidden) return;
      const n = ++urutan;
      try {
        const j = await jumlahBelumDibaca();
        if (aktif && n === urutan) setJumlah(j);
      } catch {
        if (aktif && n === urutan) setJumlah(null);
      }
    }
    void muat();
    const perbarui = () => {
      if (document.hidden) return;
      void muat();
      setUlang((n) => n + 1);
    };
    const timer = window.setInterval(perbarui, 30000);
    window.addEventListener(NOTIFIKASI_BERUBAH, perbarui);
    window.addEventListener("focus", perbarui);
    document.addEventListener("visibilitychange", perbarui);
    return () => {
      aktif = false;
      window.clearInterval(timer);
      window.removeEventListener(NOTIFIKASI_BERUBAH, perbarui);
      window.removeEventListener("focus", perbarui);
      document.removeEventListener("visibilitychange", perbarui);
    };
  }, [pathname]);
  useEffect(() => {
    if (!buka) return;
    let aktif = true;
    setMemuat(true);
    setBaris([]);
    setGalat("");
    ambilNotifikasi()
      .then((r) => {
        if (aktif) {
          setBaris(r.data.slice(0, 4));
          setJumlah(r.belum);
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
  }, [buka, ulang]);
  useEffect(() => {
    if (!buka) return;
    function tutup(e: MouseEvent) {
      if (!wadah.current?.contains(e.target as Node)) setBuka(false);
    }
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setBuka(false);
        tombol.current?.focus();
      }
    }
    document.addEventListener("mousedown", tutup);
    document.addEventListener("keydown", key);
    wadah.current
      ?.querySelector<HTMLAnchorElement>(".notifikasi-popup a")
      ?.focus();
    return () => {
      document.removeEventListener("mousedown", tutup);
      document.removeEventListener("keydown", key);
    };
  }, [buka]);
  return (
    <div
      className="lonceng-wadah"
      ref={wadah}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null))
          setBuka(false);
      }}
    >
      <button
        ref={tombol}
        data-panduan="notifikasi"
        type="button"
        className="lonceng-tombol"
        title="Notifikasi"
        aria-label={
          jumlah === null ? "Notifikasi" : `Notifikasi, ${jumlah} belum dibaca`
        }
        aria-expanded={buka}
        onClick={() => {
          if (window.matchMedia("(min-width: 1024px)").matches)
            setBuka((v) => !v);
          else router.push("/notifikasi");
        }}
      >
        <Ikon nama="lonceng" ukuran={22} />
        {jumlah !== null && jumlah > 0 && (
          <span className="lonceng-jumlah" aria-hidden="true">
            {labelJumlah(jumlah)}
          </span>
        )}
      </button>
      {buka && (
        <section
          className="notifikasi-popup"
          role="dialog"
          aria-label="Notifikasi terbaru"
        >
          <div className="notifikasi-popup-kepala">
            <h2>Notifikasi</h2>
            <button
              type="button"
              aria-label="Tutup notifikasi"
              onClick={() => setBuka(false)}
            >
              <Ikon nama="tutup" ukuran={18} />
            </button>
          </div>
          {memuat ? (
            <p role="status">Memuat notifikasi…</p>
          ) : galat ? (
            <p role="alert">
              {galat}{" "}
              <button type="button" onClick={() => setUlang((n) => n + 1)}>
                Coba lagi
              </button>
            </p>
          ) : baris.length ? (
            <DaftarNotifikasi data={baris} />
          ) : (
            <p>Belum ada notifikasi untuk Anda.</p>
          )}
          <Link className="notifikasi-lihat-semua" href="/notifikasi">
            Lihat semua notifikasi
          </Link>
        </section>
      )}
    </div>
  );
}
