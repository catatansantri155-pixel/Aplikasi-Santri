"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import PenjagaModul from "@/components/PenjagaModul";
import { modulBeranda } from "@/lib/beranda";
import { fiturTambahan } from "@/lib/fitur-tambahan";
import { ambilProfilLogin } from "@/lib/sesi";
import { supabaseTerhubung } from "@/lib/data/santri";
import type { Peran } from "@/lib/peran";
export default function Lainnya() {
  const [peran, setPeran] = useState<Peran | null>(
    !supabaseTerhubung() ? "admin" : null,
  );
  const [galat, setGalat] = useState("");
  useEffect(() => {
    let hidup = true;
    if (supabaseTerhubung())
      ambilProfilLogin()
        .then((p) => {
          if (hidup) {
            setPeran(p?.peran ?? null);
            if (!p)
              setGalat(
                "Profil belum dapat dimuat. Silakan muat ulang halaman.",
              );
          }
        })
        .catch(() => {
          if (hidup)
            setGalat("Akses belum dapat dimuat. Silakan muat ulang halaman.");
        });
    return () => {
      hidup = false;
    };
  }, []);
  const kelompok = [
    {
      judul: "Fitur tambahan",
      items: fiturTambahan(peran).map((f) => ({
        ...f,
        gambar: `/images/fitur/${f.gambar}.webp`,
      })),
    },
    {
      judul: "Modul pondok",
      items: modulBeranda(peran).map((m) => ({
        href: m.href,
        label: m.label,
        gambar: `/images/menu/${m.modul === "laporan" ? "rekap" : m.modul}.webp`,
      })),
    },
  ];
  return (
    <PenjagaModul modul="menu">
      <h1 className="judul-halaman">Lainnya</h1>
      <p className="subjudul">Semua kebutuhan pondok, dalam satu tempat.</p>
      {!peran && <p role="status">{galat || "Memuat akses akun…"}</p>}
      {kelompok.map((k) => (
        <section className="fitur-kelompok" key={k.judul}>
          <h2>{k.judul}</h2>
          <div className="fitur-bulat-kisi">
            {k.items.map((f) => (
              <Link className="fitur-bulat" key={f.href} href={f.href}>
                <span>
                  <Image src={f.gambar} alt="" width={120} height={120} />
                </span>
                <strong>{f.label}</strong>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </PenjagaModul>
  );
}
