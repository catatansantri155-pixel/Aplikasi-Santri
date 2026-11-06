"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  angkaRupiah,
  hariWib,
  rupiah,
  validasiPembayaran,
  type PembayaranBaru,
} from "@/lib/keuangan";
import {
  unggahBukti,
  kirimPembayaran,
  type DetailTagihan,
} from "@/lib/data/keuangan";
import { kompresLampiran } from "@/lib/lampiran-izin";
export default function FormPembayaran({
  tagihan,
  wali,
  onTutup,
  onSimpan,
}: {
  tagihan: DetailTagihan;
  wali: boolean;
  onTutup: () => void;
  onSimpan: () => void;
}) {
  const [sibuk, setSibuk] = useState(false),
    [kompres, setKompres] = useState(false),
    [galat, setGalat] = useState(""),
    [fileGalat, setFileGalat] = useState(""),
    [file, setFile] = useState<Blob | null>(null),
    [preview, setPreview] = useState("");
  const key = useRef(""),
    kunci = useRef(false),
    urutan = useRef(0),
    unggahan = useRef<{ blob: Blob; path: string } | null>(null);
  const tersedia = Math.max(0, tagihan.sisa - tagihan.menunggu);
  useEffect(() => {
    return () => {
      urutan.current++;
    };
  }, []);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (kunci.current || kompres || fileGalat) return;
    setGalat("");
    const f = new FormData(e.currentTarget);
    try {
      if (!key.current) key.current = crypto.randomUUID();
      const d: PembayaranBaru = {
        kunci: key.current,
        nominal: angkaRupiah(String(f.get("nominal"))),
        tanggal_bayar: String(f.get("tanggal_bayar")),
        metode: wali
          ? "transfer"
          : (String(f.get("metode")) as "transfer" | "tunai"),
        pengirim: String(f.get("pengirim")),
        bukti_path: file ? "akan-diunggah" : null,
        catatan: String(f.get("catatan")),
      };
      validasiPembayaran(d, tersedia, wali);
      if (
        !window.confirm(
          wali
            ? `Kirim bukti ${rupiah(d.nominal)} untuk diperiksa admin? Sisa tagihan berubah setelah disetujui.`
            : `Catat ${rupiah(d.nominal)} sebagai pembayaran yang SUDAH diterima? Sisa tagihan langsung berkurang.`,
        )
      )
        return;
      kunci.current = true;
      setSibuk(true);
      if (file) {
        if (unggahan.current?.blob === file)
          d.bukti_path = unggahan.current.path;
        else {
          const path = await unggahBukti(file);
          unggahan.current = { blob: file, path };
          d.bukti_path = path;
        }
      }
      await kirimPembayaran(tagihan.id, tagihan.revisi, d);
      onSimpan();
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Pembayaran belum tersimpan.");
    } finally {
      kunci.current = false;
      setSibuk(false);
    }
  }
  return (
    <section className="izin-panel">
      <h2>{wali ? "Konfirmasi pembayaran" : "Catat pembayaran diterima"}</h2>
      <p className="izin-petunjuk">
        {wali
          ? "Lakukan pembayaran melalui kanal resmi pondok, lalu kirim bukti di sini. Formulir ini tidak memindahkan uang."
          : "Gunakan untuk uang tunai atau transfer yang sudah dipastikan masuk. Bukti wali yang menunggu diproses dari daftar pembayaran."}
      </p>
      <div className="spp-pesan">
        Dapat diajukan: <strong>{rupiah(tersedia)}</strong>
        {tagihan.menunggu > 0 && (
          <span> · {rupiah(tagihan.menunggu)} sedang menunggu verifikasi.</span>
        )}
      </div>
      <form onSubmit={submit}>
        <fieldset className="izin-form" disabled={sibuk}>
          <label>
            Nominal pembayaran (Rp)
            <input
              name="nominal"
              type="number"
              min={1}
              max={tersedia}
              step={1}
              required
              placeholder="Contoh: 250000"
            />
          </label>
          <label>
            Tanggal pembayaran
            <input
              name="tanggal_bayar"
              type="date"
              required
              defaultValue={hariWib()}
              max={hariWib()}
            />
          </label>
          {!wali && (
            <label>
              Metode
              <select name="metode">
                <option value="tunai">Tunai</option>
                <option value="transfer">Transfer</option>
              </select>
            </label>
          )}
          <label>
            Nama pembayar / pemilik rekening
            <input name="pengirim" required minLength={3} maxLength={120} />
          </label>
          <label className="izin-lebar">
            Bukti pembayaran {wali ? "(wajib)" : "(opsional)"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required={wali && !file}
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
                        : "Gambar tidak dapat diproses.",
                    );
                } finally {
                  if (n === urutan.current) setKompres(false);
                }
              }}
            />
            <small>
              JPG, PNG, WebP ≤10 MB. Dikompres utuh menjadi WebP ≤400 KB.
              Pastikan nominal dan tanggal tetap terbaca.
            </small>
          </label>
          {kompres && <p role="status">Menyiapkan gambar…</p>}
          {fileGalat && (
            <p className="pesan-galat izin-lebar" role="alert">
              {fileGalat}
            </p>
          )}
          {preview && (
            <div className="izin-lebar">
              <img
                className="izin-pratinjau"
                src={preview}
                alt="Pratinjau bukti pembayaran"
              />
              <small>{Math.ceil((file?.size ?? 0) / 1024)} KB</small>
            </div>
          )}
          <label className="izin-lebar">
            Catatan (opsional)
            <textarea name="catatan" rows={2} maxLength={2000} />
          </label>
          {galat && (
            <p role="alert" className="pesan-galat izin-lebar">
              {galat}
            </p>
          )}
          <div className="izin-tindakan izin-lebar">
            <button
              type="submit"
              className="tombol tombol-utama"
              disabled={kompres || !!fileGalat || tersedia < 1}
            >
              {sibuk
                ? "Menyimpan…"
                : wali
                  ? "Kirim bukti pembayaran"
                  : "Catat pembayaran"}
            </button>
            <button type="button" onClick={onTutup}>
              Batal
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
