"use client";

/**
 * Navigasi bawah HP — susunan PER PERAN (Fase 2 audit, keputusan
 * user 3 Nov 2026 21:03 mengikuti usulan audit; menggantikan
 * susunan seragam revisi biru [Beranda·Santri·Tengah·Grafik·Akun]).
 *
 * Staf & admin: TEPAT 5 slot, slot tengah lingkaran besar gradien
 * biru terangkat berisi AKSI INTI peran:
 * - admin          : Beranda · Santri · [Kehadiran] · Laporan · Menu
 * - pengajar hifzh : Beranda · Santri · [Setoran→/hifzh] ·
 *                    Kehadiran · Menu
 * - pengajar diniyyah: Beranda · Santri · [Nilai→/diniyyah] ·
 *                      Kehadiran · Menu
 * - musyrif        : Beranda · Santri · [Catatan] · Olahraga · Menu
 * Menu membuka /menu (kisi semua modul yang boleh dibuka peran
 * itu); akun staf dijangkau lewat avatar header (blok identitas
 * menaut ke /akun), bukan slot bawah.
 *
 * Wali: EMPAT slot datar tanpa lingkaran menonjol:
 *   Beranda · Anak Saya · Perkembangan · Akun
 * "Anak Saya": tepat 1 anak → detail anak itu (/santri/<id> dari
 * ambilDaftarSantri — RLS memang hanya meloloskan anaknya sendiri);
 * lebih dari 1 anak → /santri (daftar anak); selama memuat atau
 * belum ada anak → /santri. "Perkembangan" membuka /laporan
 * (agregat anaknya dari data ber-RLS). "Akun" tetap di nav bawah
 * khusus wali.
 *
 * Penyaringan peran mengikuti pola NavTautan: sesi DIPERIKSA ULANG
 * tiap perpindahan halaman & peristiwa auth (kerangka hidup di
 * layout akar yang tidak di-remount). Selama profil belum diketahui
 * — atau tidak ada sesi — hanya Beranda & Santri yang menjadi
 * tautan; tiga slot lain dirender hampa (geometri staf 5 slot) agar
 * tidak ada tautan modul yang berkedip tampil sebelum peran
 * dipastikan.
 *
 * MODE CONTOH (env Supabase kosong): memakai susunan admin.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PERAN, type Peran } from "@/lib/peran";
import { ambilDaftarSantri, supabaseTerhubung } from "@/lib/data/santri";
import { buatKlienBrowser } from "@/lib/supabase/client";
import { ambilProfilLogin, type ProfilLogin } from "@/lib/sesi";
import { Ikon, type NamaIkon } from "@/components/Ikon";

interface SlotNav {
  href: string;
  label: string;
  ikon: NamaIkon;
  tengah?: boolean;
}

const SLOT_BERANDA: SlotNav = { href: "/", label: "Beranda", ikon: "beranda" };
const SLOT_SANTRI: SlotNav = { href: "/santri", label: "Santri", ikon: "santri" };
const SLOT_MENU: SlotNav = { href: "/menu", label: "Menu", ikon: "menu" };
const SLOT_KEHADIRAN: SlotNav = {
  href: "/kehadiran",
  label: "Kehadiran",
  ikon: "kehadiran",
};

/** Susunan 5 slot untuk admin & staf (tengah = aksi inti peran). */
function slotUntukStaf(peran: Peran): SlotNav[] {
  switch (peran) {
    case PERAN.PENGAJAR_HIFZH:
      return [
        SLOT_BERANDA,
        SLOT_SANTRI,
        { href: "/hifzh", label: "Setoran", ikon: "hifzh", tengah: true },
        SLOT_KEHADIRAN,
        SLOT_MENU,
      ];
    case PERAN.PENGAJAR_DINIYYAH:
      return [
        SLOT_BERANDA,
        SLOT_SANTRI,
        { href: "/diniyyah", label: "Nilai", ikon: "diniyyah", tengah: true },
        SLOT_KEHADIRAN,
        SLOT_MENU,
      ];
    case PERAN.MUSYRIF:
      return [
        SLOT_BERANDA,
        SLOT_SANTRI,
        { href: "/catatan", label: "Catatan", ikon: "pena", tengah: true },
        { href: "/olahraga", label: "Olahraga", ikon: "olahraga" },
        SLOT_MENU,
      ];
    default:
      // admin (dan cadangan peran staf lain)
      return [
        SLOT_BERANDA,
        SLOT_SANTRI,
        { ...SLOT_KEHADIRAN, tengah: true },
        { href: "/laporan", label: "Laporan", ikon: "rekap" },
        SLOT_MENU,
      ];
  }
}

/** Susunan 4 slot datar untuk wali (tanpa lingkaran menonjol). */
function slotUntukWali(hrefAnakSaya: string): SlotNav[] {
  return [
    SLOT_BERANDA,
    { href: hrefAnakSaya, label: "Anak Saya", ikon: "santri" },
    { href: "/laporan", label: "Perkembangan", ikon: "rekap" },
    { href: "/akun", label: "Akun", ikon: "akun" },
  ];
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
  // Untuk wali: id semua anaknya; null selama belum termuat/gagal.
  const [idAnakWali, setIdAnakWali] = useState<string[] | null>(null);

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

  // Wali: ambil id anak-anaknya (RLS hanya meloloskan anaknya
  // sendiri) untuk menentukan target slot "Anak Saya".
  useEffect(() => {
    if (modeContoh || !profil || profil.peran !== PERAN.WALI) {
      setIdAnakWali(null);
      return;
    }
    let aktif = true;
    (async () => {
      try {
        const hasil = await ambilDaftarSantri();
        if (!aktif) return;
        setIdAnakWali(hasil.data.map((s) => s.id));
      } catch {
        if (aktif) setIdAnakWali(null);
      }
    })();
    return () => {
      aktif = false;
    };
  }, [modeContoh, profil]);

  const profilDiketahui = modeContoh || (cekSelesai && profil !== null);

  // Tepat 1 anak → detailnya; selain itu (memuat, 0, atau >1) →
  // daftar /santri yang untuk wali memang hanya berisi anaknya.
  const hrefAnakSaya =
    idAnakWali && idAnakWali.length === 1
      ? `/santri/${idAnakWali[0]}`
      : "/santri";

  let slot: SlotNav[] | null = null;
  if (modeContoh) {
    slot = slotUntukStaf(PERAN.ADMIN);
  } else if (profil) {
    slot =
      profil.peran === PERAN.WALI
        ? slotUntukWali(hrefAnakSaya)
        : slotUntukStaf(profil.peran);
  }

  const aktifUntuk = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  if (!profilDiketahui || !slot) {
    // Profil belum dipastikan: geometri staf 5 slot, hanya Beranda
    // & Santri yang menjadi tautan.
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
          aktif={aktifUntuk("/santri")}
        />
        <span className="nav-slot nav-slot--hampa" aria-hidden="true" />
        <span className="nav-slot nav-slot--hampa" aria-hidden="true" />
        <span className="nav-slot nav-slot--hampa" aria-hidden="true" />
      </>
    );
  }

  return (
    <>
      {slot.map((s) =>
        s.tengah ? (
          <Link
            key={s.label}
            href={s.href}
            className={`nav-slot nav-slot--tengah${
              aktifUntuk(s.href) ? " nav-slot--tengah-aktif" : ""
            }`}
            aria-current={aktifUntuk(s.href) ? "page" : undefined}
          >
            <span className="nav-tengah-lingkaran" aria-hidden="true">
              <Ikon nama={s.ikon} ukuran={25} />
            </span>
            <span>{s.label}</span>
          </Link>
        ) : (
          <SlotTautan
            key={s.label}
            href={s.href}
            label={s.label}
            ikon={s.ikon}
            aktif={aktifUntuk(s.href)}
          />
        ),
      )}
    </>
  );
}
