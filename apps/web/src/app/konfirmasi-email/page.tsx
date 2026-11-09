"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import { Ikon } from "@/components/Ikon";
import { PenandaMuat, Putaran } from "@/components/Muat";
function Isi() {
  const params = useSearchParams();
  const [sibuk, setSibuk] = useState(false),
    [galat, setGalat] = useState("");
  const token_hash = params.get("token_hash"),
    type = params.get("type");
  const valid =
    !!token_hash && ["email", "signup", "recovery"].includes(type ?? "");
  async function konfirmasi() {
    if (sibuk || !valid) return;
    setSibuk(true);
    setGalat("");
    try {
      const r = await fetch("/api/auth/konfirmasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token_hash, type }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Konfirmasi belum berhasil.");
      window.location.replace(d.tujuan);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Konfirmasi belum berhasil.");
      setSibuk(false);
    }
  }
  return (
    <main className="pwa-gerbang">
      <section className="pwa-kartu email-konfirmasi">
        <Logo ukuran={48} />
        <span className="pwa-label">MONITORING SANTRI</span>
        <h1>
          {type === "recovery"
            ? "Pulihkan akses akun"
            : "Konfirmasi alamat email"}
        </h1>
        <p>
          {valid
            ? "Tekan tombol berikut untuk melanjutkan dengan aman. Buka tautan ini hanya jika Anda meminta pendaftaran atau pemulihan akun."
            : "Tautan tidak lengkap. Minta tautan baru dari aplikasi."}
        </p>
        {galat && (
          <p className="pesan-galat" role="alert">
            {galat}
          </p>
        )}
        <button
          className="tombol"
          disabled={!valid || sibuk}
          onClick={() => void konfirmasi()}
        >
          {sibuk ? <Putaran /> : <Ikon nama="centang" ukuran={18} />}{" "}
          {sibuk ? "Memverifikasi…" : "Konfirmasi dan lanjutkan"}
        </button>
        <Link className="tombol tombol-sekunder aksi-media" href="/lupa-sandi">
          Minta tautan pemulihan baru
        </Link>
      </section>
    </main>
  );
}
export default function Konfirmasi() {
  return (
    <Suspense fallback={<PenandaMuat teks="Memeriksa tautan email…" />}>
      <Isi />
    </Suspense>
  );
}
