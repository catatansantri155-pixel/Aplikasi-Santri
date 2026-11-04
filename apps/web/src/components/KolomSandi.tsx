"use client";

/**
 * Kolom kata sandi bersama dengan tombol tampilkan/sembunyikan
 * (ikon mata) — pola yang sama seperti halaman login (audit Fase 1:
 * .bungkus-sandi + .tombol-mata, target sentuh 44px).
 *
 * Dipakai halaman Daftar, Lupa/Atur Sandi, dan bagian Ubah Kata
 * Sandi di halaman Akun. Halaman login mempertahankan salinan
 * sebarisnya sendiri (tidak diubah, menghindari regresi alur masuk).
 */
import { useState } from "react";
import { Ikon } from "@/components/Ikon";

export default function KolomSandi({
  label,
  nama,
  nilai,
  onUbah,
  autoComplete,
  wajib = true,
}: {
  label: string;
  nama: string;
  nilai: string;
  onUbah: (nilai: string) => void;
  autoComplete: string;
  wajib?: boolean;
}) {
  const [terlihat, setTerlihat] = useState(false);
  return (
    <label>
      {label}
      <span className="bungkus-sandi">
        <input
          type={terlihat ? "text" : "password"}
          name={nama}
          autoComplete={autoComplete}
          required={wajib}
          value={nilai}
          onChange={(e) => onUbah(e.target.value)}
        />
        <button
          type="button"
          className="tombol-mata"
          aria-label={
            terlihat ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
          }
          aria-pressed={terlihat}
          onClick={() => setTerlihat((lama) => !lama)}
        >
          <Ikon nama={terlihat ? "mata-silang" : "mata"} ukuran={18} />
        </button>
      </span>
    </label>
  );
}
