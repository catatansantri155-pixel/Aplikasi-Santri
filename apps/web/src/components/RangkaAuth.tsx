/**
 * Kerangka halaman auth — mengikuti prototipe Lovable (AuthShell):
 * desktop = belah dua penuh layar; sisi kiri panel primer berisi
 * merek, visual geometris (dua bingkai persegi berputar + ikon buku
 * emas), judul besar, dan tiga langkah bernomor emas. Sisi kanan =
 * kolom formulir terpusat (maks 384px). Di HP panel disembunyikan;
 * halaman menampilkan logonya sendiri (khusus login, seperti
 * prototipe).
 */
import type { ReactNode } from "react";
import Logo from "./Logo";
import Pola from "./Pola";
import { Ikon } from "./Ikon";

const LANGKAH_BAWAAN = [
  "Masuk dengan akun dari pondok",
  "Pilih modul sesuai tugas Anda",
  "Catat, simpan, dan pantau laporannya",
];

export default function RangkaAuth({
  children,
  langkah = LANGKAH_BAWAAN,
}: {
  children: ReactNode;
  langkah?: string[];
}) {
  return (
    <div className="auth-split">
      <aside className="auth-panel" aria-hidden="true">
        <Pola className="auth-panel-pola" />
        <div className="auth-panel-merek">
          <Logo ukuran={40} />
          <span>Aplikasi Santri</span>
        </div>
        <div className="auth-panel-tengah">
          <div className="auth-visual">
            <span className="auth-visual-bingkai auth-visual-bingkai--luar" />
            <span className="auth-visual-bingkai auth-visual-bingkai--dalam" />
            <span className="auth-visual-ikon">
              <Ikon nama="hifzh" ukuran={96} />
            </span>
          </div>
          <p className="auth-panel-judul">
            Memantau tumbuhnya ilmu dan adab santri.
          </p>
          <ol className="auth-langkah">
            {langkah.map((teks, i) => (
              <li key={teks}>
                <span className="auth-langkah-nomor">{i + 1}</span>
                <span>{teks}</span>
              </li>
            ))}
          </ol>
        </div>
      </aside>
      <main className="auth-isi">{children}</main>
    </div>
  );
}
