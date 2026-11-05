import type { ReactNode } from "react";
import MerekAkses from "@/components/MerekAkses";
import VisualAkses from "@/components/VisualAkses";

const LANGKAH_BAWAAN = [
  "Masuk menggunakan email akun Anda",
  "Buka modul sesuai tugas dan akses",
  "Catat dan pantau perkembangan santri",
];
export default function RangkaAuth({
  children,
  langkah = LANGKAH_BAWAAN,
  varian = "masuk",
}: {
  children: ReactNode;
  langkah?: string[];
  varian?: "masuk" | "daftar" | "pemulihan";
}) {
  return (
    <div className="akses-shell" data-varian={varian}>
      <header className="akses-header">
        <MerekAkses />
        <span className="akses-identitas">MARHALAH WUSTHA</span>
      </header>
      <div className="akses-grid">
        <aside className="akses-panggung">
          <VisualAkses />
          <div className="akses-panggung-teks">
            <span className="akses-kicker">
              ILMU TERCATAT, PERKEMBANGAN TERPANTAU
            </span>
            <h2>
              {varian === "daftar"
                ? "Lebih dekat dengan perkembangan anak."
                : varian === "pemulihan"
                  ? "Kembali terhubung dengan akun Anda."
                  : "Satu ruang untuk mendampingi santri."}
            </h2>
            <p>
              Hafalan, nilai, kehadiran, dan keseharian dalam satu aplikasi.
            </p>
            <ol className="akses-langkah">
              {langkah.map((teks, i) => (
                <li key={teks}>
                  <span>{i + 1}</span>
                  {teks}
                </li>
              ))}
            </ol>
          </div>
        </aside>
        <main className="akses-form-panel">
          <span className="akses-kartu-kicker">
            {varian === "daftar"
              ? "AKUN ORANG TUA / WALI"
              : varian === "pemulihan"
                ? "PEMULIHAN AKUN"
                : "AHLAN WA SAHLAN"}
          </span>
          {children}
        </main>
      </div>
      <footer className="akses-footer">
        Monitoring Santri · Minhajus Sunnah Magelang
      </footer>
    </div>
  );
}
