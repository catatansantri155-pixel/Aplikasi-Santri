"use client";
import { PenandaMuat, Putaran } from "@/components/Muat";
import { useEffect, useRef, useState, type FormEvent } from "react";
import KopLayanan from "@/components/KopLayanan";
import { Ikon } from "@/components/Ikon";
import {
  ambilBanner,
  simpanLayanan,
  arsipPondok,
  unggahBanner,
  type BannerPondok,
} from "@/lib/data/pondok-layanan";
import { kompresLampiran } from "@/lib/lampiran-izin";
import { supabaseTerhubung } from "@/lib/data/santri";
export default function KelolaBanner() {
  const [halaman, setHalaman] = useState(0);
  const [data, setData] = useState<BannerPondok[]>([]),
    [arsip, setArsip] = useState(false),
    [muat, setMuat] = useState(true),
    [galat, setGalat] = useState(""),
    [ulang, setUlang] = useState(0),
    [editor, setEditor] = useState<BannerPondok | null | undefined>(),
    [file, setFile] = useState<Blob | null>(null),
    [preview, setPreview] = useState(""),
    [kompres, setKompres] = useState(false),
    [fileGalat, setFileGalat] = useState(""),
    [sibuk, setSibuk] = useState(false);
  const key = useRef(""),
    lock = useRef(false),
    urutan = useRef(0),
    upload = useRef<{ blob: Blob; path: string } | null>(null);
  useEffect(() => {
    let hidup = true;
    setMuat(true);
    setData([]);
    setGalat("");
    if (!supabaseTerhubung()) {
      setMuat(false);
      return;
    }
    ambilBanner(true, arsip, halaman)
      .then((d) => {
        if (hidup) setData(d);
      })
      .catch((e) => {
        if (hidup) setGalat(e.message);
      })
      .finally(() => {
        if (hidup) setMuat(false);
      });
    return () => {
      hidup = false;
    };
  }, [arsip, ulang, halaman]);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  useEffect(
    () => () => {
      urutan.current++;
    },
    [],
  );
  function buka(b: BannerPondok | null) {
    key.current = b?.kunci ?? crypto.randomUUID();
    urutan.current++;
    setKompres(false);
    setEditor(b);
    setFile(null);
    setFileGalat("");
    setGalat("");
  }
  async function simpan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (lock.current || kompres || fileGalat) return;
    const f = new FormData(e.currentTarget);
    try {
      const judul = String(f.get("judul")).trim(),
        n = Number(f.get("urutan"));
      if (
        judul.length < 3 ||
        judul.length > 160 ||
        !Number.isInteger(n) ||
        n < 0 ||
        n > 999
      )
        throw Error("Judul 3–160 karakter dan urutan 0–999.");
      if (!editor && !file) throw Error("Pilih gambar banner.");
      lock.current = true;
      setSibuk(true);
      let path = editor?.gambar_path ?? null,
        bawaan = editor?.bawaan ?? null;
      if (file) {
        if (upload.current?.blob === file) path = upload.current.path;
        else {
          path = await unggahBanner(file);
          upload.current = { blob: file, path };
        }
        bawaan = null;
      }
      await simpanLayanan(
        "banner",
        {
          kunci: key.current,
          judul,
          urutan: n,
          tayang: f.get("tayang") === "on",
          gambar_path: path,
          bawaan,
        },
        editor?.id ?? null,
        editor?.revisi ?? 0,
      );
      setEditor(undefined);
      setFile(null);
      setUlang((n) => n + 1);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Banner belum tersimpan.");
    } finally {
      lock.current = false;
      setSibuk(false);
    }
  }
  async function hapus(b: BannerPondok) {
    if (
      lock.current ||
      !window.confirm(
        arsip
          ? "Pulihkan banner sebagai tidak tayang? Anda dapat mengaktifkannya setelah memeriksa gambar."
          : "Hapus banner dari beranda? Banner dapat dipulihkan dari Arsip.",
      )
    )
      return;
    lock.current = true;
    setSibuk(true);
    try {
      await arsipPondok("banner", b.id, b.revisi, arsip);
      setUlang((n) => n + 1);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal mengubah arsip.");
    } finally {
      lock.current = false;
      setSibuk(false);
    }
  }
  return (
    <div className="izin-halaman pondok-layanan">
      <KopLayanan
        judul="Kelola Banner"
        kategori="Tampilan beranda"
        keterangan="Atur gambar yang tampil di bawah Menu Utama, tepat di atas informasi terbaru."
        gambar="/images/fitur/informasi.webp"
        aksi={
          <button
            className="tombol tombol-utama"
            onClick={() =>
              editor !== undefined ? setEditor(undefined) : buka(null)
            }
          >
            {editor !== undefined ? "Tutup formulir" : "Tambah banner"}
          </button>
        }
      />
      {editor !== undefined && (
        <section className="izin-panel" key={editor?.id ?? "baru"}>
          <h2>{editor ? "Ubah banner" : "Banner baru"}</h2>
          <form onSubmit={simpan}>
            <fieldset className="izin-form" disabled={sibuk}>
              <label className="izin-lebar">
                Nama / deskripsi gambar
                <input
                  name="judul"
                  required
                  minLength={3}
                  maxLength={160}
                  defaultValue={editor?.judul}
                />
                <small>
                  Dipakai untuk aksesibilitas. Tidak ditampilkan sebagai teks di
                  atas gambar.
                </small>
              </label>
              <label>
                Urutan tayang
                <input
                  name="urutan"
                  type="number"
                  min={0}
                  max={999}
                  step={1}
                  required
                  defaultValue={editor?.urutan ?? data.length + 1}
                />
              </label>
              <label className="izin-centang">
                <input
                  name="tayang"
                  type="checkbox"
                  defaultChecked={editor?.tayang ?? true}
                />
                Tayangkan di beranda
              </label>
              <label className="izin-lebar">
                {editor ? "Ganti gambar (opsional)" : "Gambar banner"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={async (e) => {
                    const n = ++urutan.current,
                      f = e.target.files?.[0];
                    setFile(null);
                    setFileGalat("");
                    if (!f) {
                      setKompres(false);
                      return;
                    }
                    setKompres(true);
                    try {
                      const b = await kompresLampiran(f);
                      if (n === urutan.current) setFile(b);
                    } catch (e) {
                      if (n === urutan.current)
                        setFileGalat(
                          e instanceof Error
                            ? e.message
                            : "Gambar gagal diproses.",
                        );
                    } finally {
                      if (n === urutan.current) setKompres(false);
                    }
                  }}
                />
                <small>
                  Disarankan rasio 3:1, misalnya 1500 × 500 px. JPG/PNG/WebP
                  maksimal 10 MB, diperkecil utuh menjadi WebP ≤400 KB.
                </small>
              </label>
              {kompres && <PenandaMuat teks="Menyiapkan gambar…" />}
              {fileGalat && (
                <p className="pesan-galat izin-lebar" role="alert">
                  {fileGalat}
                </p>
              )}
              {(preview || editor?.gambar_url) && (
                <img
                  className="banner-pratinjau izin-lebar"
                  src={preview || editor?.gambar_url}
                  alt="Pratinjau banner"
                />
              )}
              {galat && (
                <p className="pesan-galat izin-lebar" role="alert">
                  {galat}
                </p>
              )}
              <div className="izin-tindakan izin-lebar">
                <button
                  type="submit"
                  className="tombol tombol-utama"
                  disabled={kompres || !!fileGalat}
                >
                  {sibuk && <Putaran />}{" "}
                  {sibuk ? "Menyimpan…" : "Simpan banner"}
                </button>
                <button type="button" onClick={() => setEditor(undefined)}>
                  Batal
                </button>
              </div>
            </fieldset>
          </form>
        </section>
      )}
      <section className="izin-panel">
        <div className="layanan-bilah">
          <h2>{arsip ? "Arsip banner" : "Banner beranda"}</h2>
          <button
            className="layanan-refresh"
            aria-label="Muat ulang banner"
            disabled={muat}
            onClick={() => setUlang((n) => n + 1)}
          >
            <Ikon nama="muat-ulang" ukuran={18} />
          </button>
        </div>
        <label>
          Tampilan
          <select
            value={arsip ? "arsip" : "aktif"}
            onChange={(e) => {
              setArsip(e.target.value === "arsip");
              setHalaman(0);
              setEditor(undefined);
            }}
          >
            <option value="aktif">Banner aktif / tidak tayang</option>
            <option value="arsip">Arsip</option>
          </select>
        </label>
        <p className="izin-petunjuk">
          Urutan terkecil tampil lebih dahulu. Maksimal 20 banner nonarsip;
          daftar kelola menampilkan 20 banner per halaman. Banner diputar
          otomatis dan hanya menampilkan gambar.
        </p>
        {muat && <PenandaMuat teks="Memuat banner…" />}
        {editor === undefined && galat && (
          <p role="alert" className="pesan-galat">
            {galat}
          </p>
        )}
        {!muat && !galat && !data.length && (
          <p>Belum ada banner pada pilihan ini.</p>
        )}
        <div className="pondok-daftar">
          {data.slice(0, 20).map((b) => (
            <article className="pondok-kartu" key={b.id}>
              {b.gambar_url && (
                <img
                  className="banner-pratinjau"
                  src={b.gambar_url}
                  alt={b.judul}
                />
              )}
              <h3>{b.judul}</h3>
              <small>
                Urutan {b.urutan} ·{" "}
                {b.tayang && !arsip ? "Tayang" : "Tidak tayang"}
              </small>
              <div className="izin-tindakan">
                {!arsip && (
                  <button disabled={sibuk} onClick={() => buka(b)}>
                    Ubah / ganti gambar
                  </button>
                )}
                <button
                  disabled={sibuk}
                  className={arsip ? "" : "spp-bahaya"}
                  onClick={() => hapus(b)}
                >
                  {arsip ? "Pulihkan" : "Hapus"}
                </button>
              </div>
            </article>
          ))}
        </div>
        <nav className="izin-paginasi" aria-label="Halaman banner">
          <button
            disabled={muat || halaman === 0}
            onClick={() => setHalaman((v) => v - 1)}
          >
            Sebelumnya
          </button>
          <span>Halaman {halaman + 1}</span>
          <button
            disabled={muat || data.length <= 20}
            onClick={() => setHalaman((v) => v + 1)}
          >
            Berikutnya
          </button>
        </nav>
      </section>
    </div>
  );
}
