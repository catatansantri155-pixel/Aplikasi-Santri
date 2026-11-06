import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Ikon } from "@/components/Ikon";
/** Kepala halaman bersama untuk layanan tambahan; ringkas pada mobile, aksi sejajar pada PC. */
export default function KopLayanan({
  judul,
  keterangan,
  gambar,
  kategori,
  aksi,
}: {
  judul: string;
  keterangan: string;
  gambar: string;
  kategori: string;
  aksi?: ReactNode;
}) {
  return (
    <>
      <Link className="izin-kembali layanan-kembali" href="/lainnya">
        <Ikon nama="panah-kiri" ukuran={16} />
        Lainnya
      </Link>
      <header className="layanan-kop">
        <Image
          className="layanan-ilustrasi"
          src={gambar}
          width={88}
          height={88}
          alt=""
        />
        <div className="layanan-identitas">
          <p className="izin-eyebrow">{kategori}</p>
          <h1 className="judul-halaman">{judul}</h1>
          <p className="subjudul">{keterangan}</p>
        </div>
        {aksi && <div className="layanan-aksi-utama">{aksi}</div>}
      </header>
    </>
  );
}
