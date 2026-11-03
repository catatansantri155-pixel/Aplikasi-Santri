"use client";

/**
 * Halaman Menu — kisi Fast Menu semua modul (arah UI user 3 Nov
 * 2026): ikon dalam lingkaran tint + label + keterangan satu baris.
 *
 * Isi kisi DISARING PER PERAN dari peta terpusat src/lib/akses.ts
 * (metadata bersama src/lib/modul.ts): modul yang tidak berhak
 * dibuka peran yang login tidak tampil. Semua peran login boleh
 * membuka halaman ini (modul "menu" di peta akses = semua peran);
 * PenjagaModul menahan isi sampai profil termuat, sama seperti modul
 * lain.
 *
 * MODE CONTOH: tidak ada satu peran pasti, jadi semua modul tampil.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import PenandaTahap from "@/components/PenandaTahap";
import PenjagaModul from "@/components/PenjagaModul";
import { bolehAksesModul } from "@/lib/akses";
import IkonModul from "@/components/IkonModul";
import { DAFTAR_MODUL } from "@/lib/modul";
import { supabaseTerhubung } from "@/lib/data/santri";
import { ambilProfilLogin, type ProfilLogin } from "@/lib/sesi";

export default function HalamanMenu() {
  return (
    <PenjagaModul modul="menu">
      <IsiMenu />
    </PenjagaModul>
  );
}

function IsiMenu() {
  const modeContoh = !supabaseTerhubung();
  const [profil, setProfil] = useState<ProfilLogin | null>(null);
  const [memuat, setMemuat] = useState(!modeContoh);

  useEffect(() => {
    if (modeContoh) return;
    let aktif = true;
    (async () => {
      const p = await ambilProfilLogin();
      if (!aktif) return;
      setProfil(p);
      setMemuat(false);
    })();
    return () => {
      aktif = false;
    };
  }, [modeContoh]);

  const modulTampil = DAFTAR_MODUL.filter((modul) =>
    modeContoh || !profil
      ? true
      : bolehAksesModul(profil.peran, modul.modul),
  );

  return (
    <>
      {modeContoh && <PenandaTahap />}
      <h1 className="judul-halaman">Menu</h1>
      <p className="subjudul">
        Semua modul yang dapat Anda buka
        {profil ? ` sebagai ${profil.nama}` : ""}.
      </p>

      {memuat ? (
        <p className="catatan-kaki">Memuat menu…</p>
      ) : (
        <div className="kisi-menu kisi-menu--keterangan">
          {modulTampil.map((modul) => (
            <Link
              key={modul.href}
              href={modul.href}
              className="item-menu"
            >
              <IkonModul
                modul={modul.modul}
                ikon={modul.ikon}
                warna={modul.warna}
              />
              <span className="item-menu-label">{modul.label}</span>
              <span className="item-menu-ket">{modul.keterangan}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
