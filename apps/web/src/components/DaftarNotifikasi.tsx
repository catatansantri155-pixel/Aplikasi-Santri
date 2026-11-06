import Link from "next/link";
import { Ikon } from "@/components/Ikon";
import { tujuanNotifikasi, type Notifikasi } from "@/lib/data/notifikasi";
export default function DaftarNotifikasi({ data }: { data: Notifikasi[] }) {
  return (
    <ul className="notifikasi-daftar">
      {data.map((n) => (
        <li key={`${n.sumber ?? "informasi"}:${n.id}`}>
          <Link
            className={`notifikasi-baris${!n.dibaca_pada ? " notifikasi-baru" : ""}`}
            href={tujuanNotifikasi(n)}
          >
            <span className="notifikasi-gambar" aria-hidden="true">
              <Ikon nama="lonceng" ukuran={19} />
            </span>
            <span className="notifikasi-isi">
              <span className="notifikasi-meta">
                {n.kategori}
                {n.disematkan ? " · Disematkan" : ""}
              </span>
              <strong>{n.judul}</strong>
              <time dateTime={n.updated_at}>
                {new Date(n.updated_at).toLocaleString("id-ID", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
              {n.wajib_konfirmasi && !n.dikonfirmasi_pada && (
                <small>Perlu konfirmasi setelah dibaca</small>
              )}
            </span>
            {!n.dibaca_pada && (
              <span className="notifikasi-titik" aria-label="Belum dibaca" />
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
