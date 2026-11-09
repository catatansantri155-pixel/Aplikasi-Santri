"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  jendelaAplikasi,
  petunjukPemasangan,
  type PermintaanPasang,
} from "@/lib/pwa";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";
import { Ikon } from "@/components/Ikon";

/** Gerbang penggunaan jendela PWA. Tidak menyimpan flag 'sudah pasang' yang menipu. */
export default function AksesPwa({ children }: { children: ReactNode }) {
  const aktif = process.env.NODE_ENV === "production";
  const pathname = usePathname();
  const [status, setStatus] = useState<"periksa" | "browser" | "aplikasi">(
    aktif ? "periksa" : "aplikasi",
  );
  const [petunjuk, setPetunjuk] = useState<ReturnType<
    typeof petunjukPemasangan
  > | null>(null);
  const [siap, setSiap] = useState(false),
    [sibuk, setSibuk] = useState(false),
    [pesan, setPesan] = useState("");
  const permintaan = useRef<PermintaanPasang | null>(null);
  const petunjukDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!aktif) return;
    const mode = window.matchMedia("(display-mode: standalone)"),
      overlay = window.matchMedia("(display-mode: window-controls-overlay)");
    const periksa = () =>
      setStatus(
        jendelaAplikasi(
          mode.matches,
          overlay.matches,
          (navigator as Navigator & { standalone?: boolean }).standalone,
        )
          ? "aplikasi"
          : "browser",
      );
    const tawaran = (e: Event) => {
      e.preventDefault();
      permintaan.current = e as PermintaanPasang;
      setSiap(true);
    };
    const terpasang = () => {
      permintaan.current = null;
      setSiap(false);
      setPesan(
        "Pemasangan selesai. Buka Monitoring Santri dari ikon aplikasi untuk melanjutkan.",
      );
      periksa();
    };
    periksa();
    setPetunjuk(
      petunjukPemasangan(navigator.userAgent, navigator.maxTouchPoints),
    );
    window.addEventListener("beforeinstallprompt", tawaran);
    window.addEventListener("appinstalled", terpasang);
    window.addEventListener("focus", periksa);
    mode.addEventListener("change", periksa);
    overlay.addEventListener("change", periksa);
    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          setPesan(
            "Persiapan aplikasi belum berhasil. Periksa koneksi, lalu muat ulang halaman ini.",
          );
        });
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", tawaran);
      window.removeEventListener("appinstalled", terpasang);
      window.removeEventListener("focus", periksa);
      mode.removeEventListener("change", periksa);
      overlay.removeEventListener("change", periksa);
    };
  }, [aktif]);
  async function pasang() {
    const e = permintaan.current;
    if (!e || sibuk) return;
    permintaan.current = null;
    setSiap(false);
    setSibuk(true);
    setPesan("");
    try {
      await e.prompt();
      const hasil = await e.userChoice;
      setPesan(
        hasil.outcome === "accepted"
          ? "Selesaikan pemasangan, lalu buka Monitoring Santri dari ikon aplikasi."
          : "Pemasangan belum selesai. Anda dapat memasangnya melalui menu browser pada Cara memasang.",
      );
    } catch {
      setPesan("Gunakan menu browser pada Cara memasang.");
    } finally {
      setSibuk(false);
    }
  }
  // Tautan pemulihan sandi harus dapat diselesaikan pada browser pembuka surel.
  if (status === "aplikasi" || pathname === "/atur-sandi")
    return <>{children}</>;
  return (
    <main className="pwa-gerbang">
      <section className="pwa-kartu" aria-labelledby="pwa-judul">
        <div className="pwa-identitas">
          <Logo ukuran={46} />
          <span>
            <strong>Monitoring Santri</strong>
            <small>Minhajus Sunnah · Magelang</small>
          </span>
        </div>
        {status === "periksa" ? (
          <p role="status">Menyiapkan aplikasi…</p>
        ) : (
          <>
            <div className="pwa-komposisi">
              <img
                className="pwa-ilustrasi"
                src="/images/santri-study-hero.webp"
                alt="Ruang mengaji dengan rehal dan Al-Qur’an"
                width={220}
                height={220}
              />
              <div className="pwa-isi">
                <span className="pwa-label">MONITORING SANTRI</span>
                <h1 id="pwa-judul">
                  Satu aplikasi.
                  <br />
                  Dekat dengan pondok.
                </h1>
                <p>Hafalan, kehadiran, dan kabar anak dalam satu tempat.</p>
                <button
                  className="tombol pwa-pasang"
                  onClick={() =>
                    siap ? void pasang() : petunjukDialog.current?.showModal()
                  }
                  disabled={sibuk}
                >
                  <Ikon nama="masuk" ukuran={20} />
                  {sibuk ? "Membuka pemasangan…" : "Pasang sekarang"}
                </button>
                <button
                  className="pwa-muat-ulang"
                  onClick={() => petunjukDialog.current?.showModal()}
                >
                  <Ikon nama="peringatan" ukuran={16} /> Cara memasang
                </button>
                {pesan && (
                  <p className="pwa-pesan" role="status">
                    {pesan}
                  </p>
                )}
                <p className="pwa-catatan">
                  Sudah terpasang? Buka dari ikon Monitoring Santri.
                </p>
              </div>
            </div>
            <dialog
              ref={petunjukDialog}
              className="pwa-dialog"
              aria-labelledby="judul-pasang-manual"
            >
              <span className="pwa-label">{petunjuk?.platform}</span>
              <h2 id="judul-pasang-manual">Pasang Monitoring Santri</h2>
              <ol className="pwa-langkah">
                {petunjuk?.langkah.map((l, i) => (
                  <li key={l}>
                    <span>{i + 1}</span>
                    <p>{l}</p>
                  </li>
                ))}
              </ol>
              <p className="catatan-kaki">
                Dari WhatsApp atau Telegram, pilih Buka di browser terlebih
                dahulu. Gunakan browser yang mendukung pemasangan.
              </p>
              <div className="pwa-dialog-aksi">
                <button
                  className="tombol tombol-sekunder"
                  onClick={() => petunjukDialog.current?.close()}
                >
                  Kembali
                </button>
                <button
                  className="tombol tombol-sekunder"
                  onClick={() => window.location.reload()}
                >
                  <Ikon nama="muat-ulang" ukuran={16} /> Muat ulang
                </button>
              </div>
            </dialog>
          </>
        )}
      </section>
    </main>
  );
}
