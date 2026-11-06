"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ambilDaftarSantri, type Santri } from "@/lib/data/santri";
import {
  simpanIzin,
  unggahLampiran,
  type IzinDetail,
} from "@/lib/data/perizinan";
import {
  isoWib,
  inputWib,
  validasiPengajuan,
  type DataPengajuan,
} from "@/lib/perizinan";
import { kompresLampiran } from "@/lib/lampiran-izin";
export default function FormPerizinan({
  izin,
  onTutup,
  onSimpan,
}: {
  izin?: IzinDetail;
  onTutup: () => void;
  onSimpan: () => void;
}) {
  const router = useRouter(),
    kunci = useRef(izin?.kunci ?? ""),
    [anak, setAnak] = useState<Santri[]>([]),
    [sibuk, setSibuk] = useState(false),
    [kompres, setKompres] = useState(false),
    [galat, setGalat] = useState(""),
    [file, setFile] = useState<Blob | null>(null),
    [preview, setPreview] = useState(""),
    [hapus, setHapus] = useState(false);
  const unggahan = useRef<{ blob: Blob; path: string } | null>(null);
  const proses = useRef(0),
    terkunci = useRef(false),
    [fileGalat, setFileGalat] = useState("");
  useEffect(() => {
    let aktif = true;
    ambilDaftarSantri()
      .then((r) => {
        if (aktif) setAnak(r.data.filter((s) => s.statusAktif));
      })
      .catch(() => {
        if (aktif)
          setGalat(
            "Daftar anak belum dapat dimuat. Tutup formulir dan coba lagi.",
          );
      });
    return () => {
      aktif = false;
      proses.current++;
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
    if (terkunci.current || kompres || fileGalat) return;
    terkunci.current = true;
    setSibuk(true);
    setGalat("");
    let baru: string | null = null;
    try {
      const f = new FormData(e.currentTarget);
      if (!kunci.current) kunci.current = crypto.randomUUID();
      const d: DataPengajuan = {
        kunci: kunci.current,
        santri_id: String(f.get("santri_id") ?? ""),
        jenis: String(f.get("jenis")),
        alasan: String(f.get("alasan")),
        tujuan: String(f.get("tujuan")),
        rencana_keluar: isoWib(String(f.get("rencana_keluar"))),
        rencana_kembali: isoWib(String(f.get("rencana_kembali"))),
        penjemput: String(f.get("penjemput")),
        hubungan: String(f.get("hubungan")),
        kontak: String(f.get("kontak")),
        lampiran_path: hapus ? null : (izin?.lampiran_path ?? null),
      };
      validasiPengajuan(d);
      if (file) {
        if (unggahan.current?.blob === file) baru = unggahan.current.path;
        else {
          baru = await unggahLampiran(file);
          unggahan.current = { blob: file, path: baru };
        }
        d.lampiran_path = baru;
      }
      const id = await simpanIzin(d, izin?.id ?? null, izin?.revisi ?? 0);
      onSimpan();
      router.push(`/perizinan/${id}`);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Pengajuan belum tersimpan.");
    } finally {
      terkunci.current = false;
      setSibuk(false);
    }
  }
  return (
    <section className="izin-panel">
      <h2>{izin ? "Perbaiki pengajuan" : "Ajukan izin santri"}</h2>
      <p>
        Isi sesuai rencana. Persetujuan pondok diperlukan sebelum santri
        berangkat.
      </p>
      <form onSubmit={submit}>
        <fieldset disabled={sibuk} className="izin-form">
          <label>
            Anak
            <select
              name="santri_id"
              required
              defaultValue={izin?.santri_id ?? ""}
              disabled={!!izin}
            >
              <option value="">Pilih anak</option>
              {anak.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama} · {s.kelasNama}
                </option>
              ))}
            </select>
            {izin && (
              <input type="hidden" name="santri_id" value={izin.santri_id} />
            )}
          </label>
          <label>
            Jenis izin
            <select name="jenis" defaultValue={izin?.jenis ?? "pulang"}>
              <option value="pulang">Pulang</option>
              <option value="keluar">Keluar sementara</option>
              <option value="berobat">Berobat</option>
            </select>
          </label>
          <label>
            Rencana keluar (WIB)
            <input
              name="rencana_keluar"
              type="datetime-local"
              required
              defaultValue={izin ? inputWib(izin.rencana_keluar) : ""}
            />
          </label>
          <label>
            Rencana kembali (WIB)
            <input
              name="rencana_kembali"
              type="datetime-local"
              required
              defaultValue={izin ? inputWib(izin.rencana_kembali) : ""}
            />
          </label>
          <label className="izin-lebar">
            Alasan izin
            <textarea
              name="alasan"
              required
              minLength={5}
              maxLength={2000}
              rows={3}
              defaultValue={izin?.alasan}
            />
          </label>
          <label className="izin-lebar">
            Alamat / tujuan
            <input
              name="tujuan"
              required
              minLength={3}
              maxLength={300}
              defaultValue={izin?.tujuan}
            />
          </label>
          <label>
            Nama penjemput
            <input
              name="penjemput"
              required
              minLength={3}
              maxLength={120}
              defaultValue={izin?.penjemput}
            />
          </label>
          <label>
            Hubungan dengan santri
            <input
              name="hubungan"
              required
              minLength={2}
              maxLength={80}
              placeholder="Contoh: Ayah"
              defaultValue={izin?.hubungan}
            />
          </label>
          <label>
            Nomor kontak
            <input
              name="kontak"
              required
              type="tel"
              maxLength={24}
              defaultValue={izin?.kontak}
            />
          </label>
          <label>
            Lampiran gambar (opsional)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={async (e) => {
                const n = ++proses.current;
                const f = e.target.files?.[0];
                setFile(null);
                setFileGalat("");
                if (!f) {
                  setKompres(false);
                  return;
                }
                setKompres(true);
                try {
                  const b = await kompresLampiran(f);
                  if (n === proses.current) setFile(b);
                } catch (e) {
                  if (n === proses.current)
                    setFileGalat(
                      e instanceof Error
                        ? e.message
                        : "Gambar tidak dapat diproses.",
                    );
                } finally {
                  if (n === proses.current) setKompres(false);
                }
              }}
            />
            <small>
              JPG, PNG, WebP ≤10 MB. Diperkecil hingga 400 KB tanpa memotong
              gambar.
            </small>
          </label>
          {kompres && <p role="status">Menyiapkan gambar…</p>}
          {fileGalat && (
            <p className="pesan-galat" role="alert">
              {fileGalat}
            </p>
          )}
          {preview && (
            <div className="izin-lebar">
              <img
                src={preview}
                alt="Pratinjau lampiran"
                className="izin-pratinjau"
              />
              <small>
                {Math.ceil((file?.size ?? 0) / 1024)} KB · periksa agar teks
                tetap terbaca
              </small>
            </div>
          )}
          {izin?.lampiran_path && !file && (
            <label className="izin-lebar izin-centang">
              <input
                type="checkbox"
                checked={hapus}
                onChange={(e) => setHapus(e.target.checked)}
              />
              Hapus lampiran lama dari pengajuan ini
            </label>
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
              disabled={kompres || !!fileGalat || !anak.length}
            >
              {sibuk
                ? "Menyimpan…"
                : izin
                  ? "Kirim perbaikan"
                  : "Kirim pengajuan"}
            </button>
            <button type="button" className="tombol tombol-sekunder" onClick={onTutup}>
              Batal
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
