"use client";
import { useEffect, useRef, useState } from "react";
import { Ikon } from "@/components/Ikon";
import AvatarInisial from "@/components/AvatarInisial";
import {
  ambilFotoProfil,
  kompresFoto,
  simpanFotoProfil,
  hapusFotoProfil,
} from "@/lib/foto-profil";
export default function FotoProfil({ id, nama }: { id: string; nama: string }) {
  const [url, setUrl] = useState<string | null>(null),
    [blob, setBlob] = useState<Blob | null>(null),
    [preview, setPreview] = useState<string>(),
    [proses, setProses] = useState(false),
    [galat, setGalat] = useState(""),
    [pesan, setPesan] = useState("");
  const urutan = useRef(0);
  useEffect(() => {
    let aktif = true;
    setUrl(null);
    const versi = urutan.current;
    ambilFotoProfil(id)
      .then((u) => {
        if (aktif && versi === urutan.current) setUrl(u);
      })
      .catch(() => {});
    return () => {
      aktif = false;
      urutan.current++;
    };
  }, [id]);
  useEffect(() => {
    if (!blob) {
      setPreview(undefined);
      return;
    }
    const u = URL.createObjectURL(blob);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  async function pilih(file: File) {
    const n = ++urutan.current;
    setProses(true);
    setGalat("");
    setPesan("");
    try {
      const hasil = await kompresFoto(file);
      if (n === urutan.current) setBlob(hasil);
    } catch (e) {
      if (n === urutan.current)
        setGalat(e instanceof Error ? e.message : "Foto belum dapat diproses.");
    } finally {
      if (n === urutan.current) setProses(false);
    }
  }
  async function simpan() {
    if (!blob || proses) return;
    setProses(true);
    setGalat("");
    setPesan("");
    try {
      await simpanFotoProfil(id, blob);
      setUrl(await ambilFotoProfil(id));
      setBlob(null);
      setPesan("Foto profil tersimpan.");
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Foto belum tersimpan.");
    } finally {
      setProses(false);
    }
  }
  async function hapus() {
    if (proses) return;
    setProses(true);
    setGalat("");
    setPesan("");
    try {
      await hapusFotoProfil(id);
      setUrl(null);
      setBlob(null);
      setPesan("Foto dihapus. Profil kembali memakai inisial.");
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Foto belum dihapus.");
    } finally {
      setProses(false);
    }
  }
  return (
    <section
      className="kartu foto-profil-editor"
      aria-labelledby="judul-foto-profil"
    >
      <div>
        <h2 id="judul-foto-profil">Foto profil</h2>
        <p className="catatan-kaki">
          Foto otomatis dipotong persegi dan dikompres menjadi WebP, maksimal
          384 × 384 px dan 100 KB. Foto baru menggantikan foto lama.
        </p>
      </div>
      <div className="foto-profil-baris">
        <div className="foto-profil-preview">
          {preview || url ? (
            <>
              {}
              <img
                src={preview ?? url!}
                alt="Pratinjau foto profil"
                onError={() => {
                  if (!preview) setUrl(null);
                }}
              />
            </>
          ) : (
            <AvatarInisial nama={nama} ukuran="besar" />
          )}
        </div>
        <div className="foto-profil-kontrol">
          <label
            className={`tombol tombol-sekunder aksi-media foto-profil-pilih${proses ? " foto-profil-sibuk" : ""}`}
          >
            <Ikon nama="gambar" ukuran={18} /> Pilih foto
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={proses}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void pilih(f);
              }}
            />
          </label>
          {blob && (
            <>
              <span className="foto-profil-ukuran">
                Hasil kompresi:{" "}
                {(blob.size / 1024).toLocaleString("id-ID", {
                  maximumFractionDigits: 1,
                })}{" "}
                KB
              </span>
              <button
                className="tombol aksi-media"
                type="button"
                disabled={proses}
                onClick={() => void simpan()}
              >
                <Ikon nama="centang" ukuran={18} /> Simpan foto
              </button>
              <button
                className="tombol tombol-sekunder aksi-media"
                type="button"
                disabled={proses}
                onClick={() => setBlob(null)}
              >
                Batal
              </button>
            </>
          )}
          {!blob && url && (
            <button
              className="tombol tombol-sekunder aksi-media aksi-media-bahaya foto-profil-hapus"
              type="button"
              disabled={proses}
              onClick={() => void hapus()}
            >
              <Ikon nama="hapus" ukuran={18} /> Hapus foto
            </button>
          )}
        </div>
      </div>
      {proses && (
        <p role="status" className="catatan-kaki">
          Memproses foto…
        </p>
      )}
      {galat && (
        <p className="pesan-galat" role="alert">
          {galat}
        </p>
      )}
      {pesan && (
        <p className="pesan-sukses" role="status">
          {pesan}
        </p>
      )}
    </section>
  );
}
