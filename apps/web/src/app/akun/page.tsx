"use client";

/**
 * Halaman Akun — profil pengguna yang login: avatar inisial besar,
 * nama, peran, surel, penjelasan hak akses peran dalam bahasa polos,
 * dan tombol Keluar (mekanisme sesi bersama lib/sesi.ts:
 * keluarDariSesi). Sejak revisi biru 3 Nov 2026, tombol Keluar
 * HANYA ada di halaman ini — kerangka (kepala & sidebar) hanya
 * menampilkan blok identitas yang menaut ke sini.
 *
 * Boleh dibuka semua peran yang login (modul "akun" di peta akses =
 * semua peran); isinya hanya data profil sendiri. MODE CONTOH tidak
 * punya sesi asli, jadi yang tampil kartu penjelasan mode contoh.
 *
 * Bagian "Ubah kata sandi" (4 Nov 2026): semua peran yang masuk
 * dapat mengganti sandinya sendiri lewat supabase.auth.updateUser —
 * melengkapi alur lupa sandi untuk pengguna yang masih bisa masuk.
 */
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PenandaTahap from "@/components/PenandaTahap";
import PenjagaModul from "@/components/PenjagaModul";
import AvatarInisial from "@/components/AvatarInisial";
import KolomSandi from "@/components/KolomSandi";
import { Ikon } from "@/components/Ikon";
import { buatKlienBrowser } from "@/lib/supabase/client";
import {
  bacaTampilan,
  terapkanTampilan,
  type PilihanTampilan,
} from "@/lib/tampilan";
import { LABEL_PERAN, RINGKASAN_PERAN } from "@/lib/peran";
import { supabaseTerhubung } from "@/lib/data/santri";
import {
  ambilProfilLogin,
  keluarDariSesi,
  type ProfilLogin,
} from "@/lib/sesi";

export default function HalamanAkun() {
  return (
    <PenjagaModul modul="akun">
      <IsiAkun />
    </PenjagaModul>
  );
}

/**
 * Pengaturan tampilan (arahan user 4 Nov 2026: slot nav Menu diganti
 * Akun, dan di Akun "ada banyak pengaturan — mode malam dan mode
 * siang, atur sandi, atur ini itu seluruhnya"). Mode Terang/Gelap &
 * ukuran teks adalah preferensi PERANGKAT (lib/tampilan.ts):
 * diterapkan seketika ke seluruh aplikasi dan tersimpan di
 * localStorage, berlaku juga sebelum masuk.
 */
function BagianPengaturan() {
  const [tampilan, setTampilan] = useState<PilihanTampilan>({
    tema: "terang",
    ukuranTeks: "standar",
  });

  useEffect(() => {
    setTampilan(bacaTampilan());
  }, []);

  function ubah(patch: Partial<PilihanTampilan>) {
    const baru = { ...tampilan, ...patch };
    setTampilan(baru);
    terapkanTampilan(baru);
  }

  return (
    <>
      {/* Judul bagian polos prototipe di LUAR kartu; baris berisi
          label + segmen kecil, tanpa keterangan dan tanpa ikon. */}
      <h2 className="judul-bagian">Tampilan</h2>
      <section className="kartu" style={{ paddingTop: 4, paddingBottom: 4 }}>
        <div className="baris-atur">
          <span className="atur-label">Mode</span>
          <span
            className="segmen segmen--kecil"
            role="group"
            aria-label="Mode tampilan"
          >
            <button
              type="button"
              aria-pressed={tampilan.tema === "terang"}
              onClick={() => ubah({ tema: "terang" })}
            >
              Terang
            </button>
            <button
              type="button"
              aria-pressed={tampilan.tema === "gelap"}
              onClick={() => ubah({ tema: "gelap" })}
            >
              Gelap
            </button>
          </span>
        </div>
        <div className="baris-atur">
          <span className="atur-label">Ukuran teks</span>
          <span
            className="segmen segmen--kecil"
            role="group"
            aria-label="Ukuran teks"
          >
            {(
              [
                ["kecil", "Kecil"],
                ["standar", "Standar"],
                ["besar", "Besar"],
              ] as const
            ).map(([nilai, label]) => (
              <button
                key={nilai}
                type="button"
                aria-pressed={tampilan.ukuranTeks === nilai}
                onClick={() => ubah({ ukuranTeks: nilai })}
              >
                {label}
              </button>
            ))}
          </span>
        </div>
      </section>
    </>
  );
}

/** Tautan perkenalan ulang + keterangan aplikasi. */
function BagianLainnya() {
  return (
    <>
      <h2 className="judul-bagian">Lainnya</h2>
      <section className="kartu">
        <Link href="/sambutan" className="tautan-baris">
          Lihat perkenalan aplikasi
          <span className="baris-kanan">
            <Ikon nama="chevron-kanan" ukuran={16} />
          </span>
        </Link>
        <p className="catatan-kaki" style={{ marginTop: 8 }}>
          Aplikasi Santri — pemantauan hifzh, diniyyah, kehadiran,
          olahraga, dan catatan musyrif. Ponpes Minhajus Sunnah Magelang
          · Marhalah Wustha.
        </p>
      </section>
    </>
  );
}

function IsiAkun() {
  const modeContoh = !supabaseTerhubung();
  const router = useRouter();
  const [profil, setProfil] = useState<ProfilLogin | null>(null);
  const [memuat, setMemuat] = useState(!modeContoh);
  const [prosesKeluar, setProsesKeluar] = useState(false);

  // Ubah kata sandi
  const [sandiBaru, setSandiBaru] = useState("");
  const [konfirmasiBaru, setKonfirmasiBaru] = useState("");
  const [pesanSandi, setPesanSandi] = useState<string | null>(null);
  const [sandiSukses, setSandiSukses] = useState(false);
  const [prosesSandi, setProsesSandi] = useState(false);

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

  async function tanganiKeluar() {
    setProsesKeluar(true);
    await keluarDariSesi();
    router.replace("/login");
    router.refresh();
  }

  async function tanganiUbahSandi(acara: FormEvent<HTMLFormElement>) {
    acara.preventDefault();
    setPesanSandi(null);
    setSandiSukses(false);
    if (sandiBaru.length < 6) {
      setPesanSandi("Kata sandi baru minimal 6 karakter.");
      return;
    }
    if (sandiBaru !== konfirmasiBaru) {
      setPesanSandi("Konfirmasi kata sandi tidak sama. Periksa kembali.");
      return;
    }
    setProsesSandi(true);
    try {
      const supabase = buatKlienBrowser();
      const { error } = await supabase.auth.updateUser({
        password: sandiBaru,
      });
      if (error) {
        setPesanSandi(
          /different from the old|same as/i.test(error.message)
            ? "Kata sandi baru harus berbeda dari kata sandi lama."
            : "Gagal menyimpan kata sandi baru. Coba lagi beberapa saat lagi.",
        );
        return;
      }
      setSandiBaru("");
      setKonfirmasiBaru("");
      setSandiSukses(true);
      setPesanSandi(
        "Kata sandi berhasil diubah. Gunakan kata sandi baru untuk masuk berikutnya.",
      );
    } catch {
      setPesanSandi(
        "Gagal menghubungi layanan. Coba lagi beberapa saat lagi.",
      );
    } finally {
      setProsesSandi(false);
    }
  }

  if (modeContoh) {
    return (
      <div style={{ maxWidth: 576 }}>
        <PenandaTahap />
        <h1 className="judul-halaman">Akun</h1>
        <p className="subjudul">Profil pengguna yang masuk.</p>
        <section className="kartu kartu-akun">
          <AvatarInisial nama="Pengguna Contoh" ukuran="besar" />
          <h2>Mode contoh</h2>
          <p>
            Aplikasi sedang berjalan tanpa login asli (env Supabase
            belum terisi), jadi belum ada profil yang bisa ditampilkan.
            Pada pemakaian asli, halaman ini berisi nama, peran, dan
            surel akun yang masuk beserta tombol keluar.
          </p>
          <Link href="/login" className="tombol">
            Ke halaman masuk
          </Link>
        </section>
        <BagianPengaturan />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 576 }}>
      <h1 className="judul-halaman">Akun</h1>

      {memuat && <p className="catatan-kaki">Memuat profil…</p>}

      {!memuat && !profil && (
        <p className="pesan-galat" role="alert">
          Profil pengguna belum ditemukan di tabel profiles. Hubungi
          admin agar akun Anda didaftarkan profil dan perannya.
        </p>
      )}

      {!memuat && profil && (
        <>
          {/* Kartu profil prototipe: baris avatar 48px + nama tebal
              + peran redup (+ surel kecil). */}
          <section className="kartu kartu-profil">
            <AvatarInisial nama={profil.nama} ukuran="sedang" />
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 700,
                  lineHeight: 1.3,
                }}
              >
                {profil.nama}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: "var(--teks-redup)",
                }}
              >
                {LABEL_PERAN[profil.peran]}
              </p>
              {profil.email && (
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: "var(--teks-redup)",
                    overflowWrap: "anywhere",
                  }}
                >
                  {profil.email}
                </p>
              )}
            </div>
          </section>

          <section className="kartu">
            <h2>Hak akses Anda</h2>
            <p>{RINGKASAN_PERAN[profil.peran]}</p>
            <p className="catatan-kaki">
              Menu dan tombol yang tampil di aplikasi mengikuti hak
              akses ini; data yang bukan hak Anda tidak ditampilkan dan
              ditolak langsung oleh database.
            </p>
          </section>

          <BagianPengaturan />

          <section className="kartu">
            <h2>Ubah kata sandi</h2>
            <p>
              Ganti kata sandi akun Anda. Kata sandi baru berlaku untuk
              masuk berikutnya di semua perangkat.
            </p>
            <form className="formulir" onSubmit={tanganiUbahSandi}>
              <KolomSandi
                label="Kata sandi baru"
                nama="kata-sandi-baru"
                autoComplete="new-password"
                nilai={sandiBaru}
                onUbah={setSandiBaru}
              />
              <KolomSandi
                label="Konfirmasi kata sandi baru"
                nama="konfirmasi-kata-sandi-baru"
                autoComplete="new-password"
                nilai={konfirmasiBaru}
                onUbah={setKonfirmasiBaru}
              />
              {pesanSandi && (
                <p
                  className={sandiSukses ? "pesan-sukses" : "pesan-galat"}
                  role={sandiSukses ? "status" : "alert"}
                >
                  {pesanSandi}
                </p>
              )}
              <button
                type="submit"
                className="tombol"
                disabled={prosesSandi}
              >
                {prosesSandi ? "Menyimpan…" : "Simpan kata sandi baru"}
              </button>
            </form>
          </section>

          <BagianLainnya />

          <button
            type="button"
            className="tombol tombol-penuh tombol-keluar"
            onClick={tanganiKeluar}
            disabled={prosesKeluar}
          >
            {prosesKeluar ? "Memproses…" : "Keluar"}
          </button>
        </>
      )}
    </div>
  );
}
