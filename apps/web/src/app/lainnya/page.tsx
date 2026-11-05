"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import PenjagaModul from "@/components/PenjagaModul";
import { modulBeranda } from "@/lib/beranda";
import { ambilProfilLogin } from "@/lib/sesi";
import { supabaseTerhubung } from "@/lib/data/santri";
import type { Peran } from "@/lib/peran";
import { Ikon } from "@/components/Ikon";
export default function HalamanLainnya() {
  const [peran, setPeran] = useState<Peran | null>(
    !supabaseTerhubung() ? "admin" : null,
  );
  useEffect(() => {
    let aktif = true;
    if (supabaseTerhubung())
      ambilProfilLogin()
        .then((p) => {
          if (aktif) setPeran(p?.peran ?? null);
        })
        .catch(() => {
          if (aktif) setPeran(null);
        });
    return () => {
      aktif = false;
    };
  }, []);
  return (
    <PenjagaModul modul="menu">
      <h1 className="judul-halaman">Lainnya</h1>
      <p className="subjudul">
        Seluruh modul dan fitur tambahan sesuai akses akun Anda.
      </p>
      <div className="lainnya-kisi">
        <Link className="lainnya-item" href="/informasi">
          <Ikon nama="catatan" ukuran={24} />
          <span>
            <strong>Informasi pondok</strong>
            <small>
              {peran === "admin"
                ? "Buat draf, terbitkan, dan ubah informasi untuk seluruh akun."
                : "Pengumuman terbaru dari Admin Utama."}
            </small>
          </span>
        </Link>
        <Link className="lainnya-item" href="/akun">
          <Ikon nama="akun" ukuran={24} />
          <span>
            <strong>Akun dan pengaturan</strong>
            <small>Profil, tampilan, dan kata sandi akun Anda.</small>
          </span>
        </Link>
        {modulBeranda(peran).map((m) => (
          <Link className="lainnya-item" key={m.href} href={m.href}>
            <Ikon nama={m.ikon} ukuran={24} />
            <span>
              <strong>{m.label}</strong>
              <small>{m.keterangan}</small>
            </span>
          </Link>
        ))}
      </div>
      {!peran && <p role="status">Memuat akses akun…</p>}
    </PenjagaModul>
  );
}
