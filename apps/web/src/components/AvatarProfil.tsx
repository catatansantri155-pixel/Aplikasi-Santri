"use client";
import { useEffect, useState } from "react";
import AvatarInisial from "@/components/AvatarInisial";
import { ambilFotoProfil, FOTO_BERUBAH } from "@/lib/foto-profil";
export default function AvatarProfil({
  id,
  nama,
  ukuran = "sedang",
}: {
  id: string;
  nama: string;
  ukuran?: "kecil" | "sedang" | "besar";
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let aktif = true;
    let versi = 0;
    setUrl(null);
    async function muat() {
      const urutan = ++versi;
      const foto = await ambilFotoProfil(id).catch(() => null);
      if (aktif && urutan === versi) setUrl(foto);
    }
    function berubah(e: Event) {
      if ((e as CustomEvent).detail === id) void muat();
    }
    void muat();
    window.addEventListener(FOTO_BERUBAH, berubah);
    const timer = window.setInterval(() => void muat(), 45 * 60 * 1000);
    return () => {
      aktif = false;
      window.clearInterval(timer);
      window.removeEventListener(FOTO_BERUBAH, berubah);
    };
  }, [id]);
  if (!url) return <AvatarInisial nama={nama} ukuran={ukuran} />;
  return (
    <span
      className={`avatar-inisial avatar-inisial--${ukuran} avatar-foto`}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" onError={() => setUrl(null)} />
    </span>
  );
}
