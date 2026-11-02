import PenandaTahap from "@/components/PenandaTahap";

export default function HalamanLogin() {
  return (
    <>
      <PenandaTahap teks="FORMULIR PLACEHOLDER · LOGIN ASLI TAHAP BERIKUTNYA" />
      <h1 className="judul-halaman">Masuk</h1>
      <p className="subjudul">
        Login akan memakai Supabase Auth. Pada tahap scaffold formulir ini belum
        mengirim data ke mana pun.
      </p>

      <form className="formulir" action="#" method="post">
        <label>
          Alamat surel
          <input type="email" name="email" autoComplete="username" required />
        </label>
        <label>
          Kata sandi
          <input
            type="password"
            name="kata-sandi"
            autoComplete="current-password"
            required
          />
        </label>
        <button type="submit" className="tombol">
          Masuk
        </button>
      </form>

      <p className="catatan-kaki">
        Peran pengguna (admin, pengajar hifzh, pengajar diniyyah, musyrif, orang
        tua) ditentukan dari akun yang terdaftar, bukan dipilih di formulir ini.
      </p>
    </>
  );
}
