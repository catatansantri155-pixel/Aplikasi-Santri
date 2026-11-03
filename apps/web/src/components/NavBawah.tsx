"use client";

/**
 * Navigasi bawah HP — TEPAT 5 slot (arah UI user 3 Nov 2026,
 * referensi UNPIX Mobile):
 *
 *   [Beranda] [Santri] [TENGAH MENONJOL] [Menu] [Akun]
 *
 * Slot tengah adalah lingkaran besar gradien hijau terangkat, berisi
 * AKSI INTI peran yang login:
 * - admin, pengajar hifzh, pengajar diniyyah → Kehadiran
 * - musyrif → Catatan
 * - wali → detail anak pertamanya (daftar santri untuk wali memang
 *   hanya berisi anaknya sendiri dari RLS; belum termuat/gagal →
 *   tautan /santri)
 * Menu membuka /menu (kisi Fast Menu semua modul peran itu); Akun
 * membuka /akun (profil + keluar).
 *
 * Penyaringan peran mengikuti pola NavTautan: sesi DIPERIKSA ULANG
 * tiap perpindahan halaman & peristiwa auth (kerangka hidup di layout
 * akar yang tidak di-remount). Selama profil belum diketahui — atau
 * tidak ada sesi — hanya Beranda & Santri yang menjadi tautan; tiga
 * slot lain dirender hampa (tanpa tautan) agar tidak ada tautan modul
 * yang berkedip tampil sebelum peran dipastikan.
 *
 * MODE CONTOH (env Supabase kosong): kelima slot tampil; slot tengah
 * menunjuk Kehadiran (mode contoh tidak punya satu peran pasti).
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PERAN, type Peran } from "@/lib/peran";
import { ambilDaftarSantri, supabaseTerhubung } from "@/lib/data/santri";
import { buatKlienBrowser } from "@/lib/supabase/client";
import { ambilProfilLogin, type ProfilLogin } from "@/lib/sesi";
import { Ikon, type NamaIkon } from "@/components/Ikon";

interface TargetTengah {
  href: string;
  label: string;
  ikon: NamaIkon;
}

/** Aksi inti slot tengah untuk peran staf & musyrif (wali khusus). */
function targetTengahPeran(peran: Peran): TargetTengah {
  if (peran === PERAN.MUSYRIF) {
    return { href: "/catatan", label: "Catatan", ikon: "pena" };
  }
  // admin + kedua pengajar
  return { href: "/kehadiran", label: "Kehadiran", ikon: "kehadiran" };
}

function SlotTautan({
  href,
  label,
  ikon,
  aktif,
}: {
  href: string;
  label: string;
  ikon: NamaIkon;
  aktif: boolean;
}) {
  return (
    <Link
      href={href}
      className={`nav-slot${aktif ? " nav-slot--aktif" : ""}`}
      aria-current={aktif ? "page" : undefined}
    >
      <span className="nav-ikon" aria-hidden="true">
        <Ikon nama={ikon} ukuran={21} />
      </span>
      <span>{label}</span>
    </Link>
  );
}

export default function NavBawah() {
  const modeContoh = !supabaseTerhubung();
  const pathname = usePathname();
  const [profil, setProfil] = useState<ProfilLogin | null>(null);
  const [cekSelesai, setCekSelesai] = useState(modeContoh);
  const profilRef = useRef<ProfilLogin | null>(null);
  // Untuk wali: href detail anak pertama; null selama belum termuat.
  const [hrefAnakWali, setHrefAnakWali] = useState<string | null>(null);

  useEffect(() => {
    if (modeContoh) return;
    let aktif = true;
    const supabase = buatKlienBrowser();

    const periksaSesi = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!aktif) return;
      const idSesi = session?.user?.id ?? null;

      if (!idSesi) {
        profilRef.current = null;
        setProfil(null);
        setCekSelesai(true);
        return;
      }
      if (profilRef.current && profilRef.current.id === idSesi) {
        setCekSelesai(true);
        return;
      }
      profilRef.current = null;
      setProfil(null);
      setCekSelesai(false);
      const p = await ambilProfilLogin();
      if (!aktif) return;
      profilRef.current = p;
      setProfil(p);
      setCekSelesai(true);
    };

    void periksaSesi();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((peristiwa) => {
      if (
        peristiwa === "SIGNED_IN" ||
        peristiwa === "SIGNED_OUT" ||
        peristiwa === "USER_UPDATED"
      ) {
        void periksaSesi();
      }
    });
    return () => {
      aktif = false;
      subscription.unsubscribe();
    };
  }, [modeContoh, pathname]);

  // Wali: ambil anak pertama dari daftar santrinya (RLS hanya
  // meloloskan anaknya sendiri) untuk target slot tengah.
  useEffect(() => {
    if (modeContoh || !profil || profil.peran !== PERAN.WALI) {
      setHrefAnakWali(null);
      return;
    }
    let aktif = true;
    (async () => {
      try {
        const hasil = await ambilDaftarSantri();
        if (!aktif) return;
        const anak = hasil.data[0];
        setHrefAnakWali(anak ? `/santri/${anak.id}` : null);
      } catch {
        if (aktif) setHrefAnakWali(null);
      }
    })();
    return () => {
      aktif = false;
    };
  }, [modeContoh, profil]);

  const profilDiketahui = modeContoh || (cekSelesai && profil !== null);

  let tengah: TargetTengah | null = null;
  if (modeContoh) {
    tengah = targetTengahPeran(PERAN.ADMIN);
  } else if (profil) {
    tengah =
      profil.peran === PERAN.WALI
        ? {
            href: hrefAnakWali ?? "/santri",
            label: "Anak Saya",
            ikon: "santri",
          }
        : targetTengahPeran(profil.peran);
  }

  const aktifUntuk = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <SlotTautan
        href="/"
        label="Beranda"
        ikon="beranda"
        aktif={pathname === "/"}
      />
      <SlotTautan
        href="/santri"
        label="Santri"
        ikon="santri"
        aktif={aktifUntuk("/santri") && tengah?.href !== pathname}
      />
      {tengah ? (
        <Link
          href={tengah.href}
          className={`nav-slot nav-slot--tengah${
            aktifUntuk(tengah.href) ? " nav-slot--tengah-aktif" : ""
          }`}
          aria-current={aktifUntuk(tengah.href) ? "page" : undefined}
        >
          <span className="nav-tengah-lingkaran" aria-hidden="true">
            <Ikon nama={tengah.ikon} ukuran={25} />
          </span>
          <span>{tengah.label}</span>
        </Link>
      ) : (
        <span className="nav-slot nav-slot--hampa" aria-hidden="true" />
      )}
      {profilDiketahui ? (
        <>
          <SlotTautan
            href="/menu"
            label="Menu"
            ikon="menu"
            aktif={pathname === "/menu"}
          />
          <SlotTautan
            href="/akun"
            label="Akun"
            ikon="akun"
            aktif={pathname === "/akun"}
          />
        </>
      ) : (
        <>
          <span className="nav-slot nav-slot--hampa" aria-hidden="true" />
          <span className="nav-slot nav-slot--hampa" aria-hidden="true" />
        </>
      )}
    </>
  );
}
