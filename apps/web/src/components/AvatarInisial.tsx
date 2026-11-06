/** Inisial nama sebagai avatar cadangan; foto akun dikelola AvatarProfil. */

/** Ambil inisial: huruf pertama dari dua kata pertama nama. */
export function inisialDari(nama: string): string {
  const kata = nama.trim().split(/\s+/).filter(Boolean);
  if (kata.length === 0) return "?";
  if (kata.length === 1) return kata[0].slice(0, 1).toUpperCase();
  return (kata[0][0] + kata[1][0]).toUpperCase();
}

export default function AvatarInisial({
  nama,
  ukuran = "sedang",
  diBanner = false,
}: {
  nama: string;
  /** kecil = 40px (baris daftar), sedang = 44px (kepala), besar = 56px. */
  ukuran?: "kecil" | "sedang" | "besar";
  /** Di atas banner gradien: cincin putih tembus pandang, bukan hijau. */
  diBanner?: boolean;
}) {
  return (
    <span
      className={`avatar-inisial avatar-inisial--${ukuran}${
        diBanner ? " avatar-inisial--di-banner" : ""
      }`}
      aria-hidden="true"
    >
      {inisialDari(nama)}
    </span>
  );
}
