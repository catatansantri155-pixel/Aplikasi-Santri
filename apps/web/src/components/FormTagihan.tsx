"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  santriTagihan,
  terbitkanTagihan,
  type PilihanSantri,
} from "@/lib/data/keuangan";
import {
  JENIS_TAGIHAN,
  angkaRupiah,
  validasiTagihan,
  rupiah,
  hariWib,
  type JenisTagihan,
  type TagihanBaru,
} from "@/lib/keuangan";
export default function FormTagihan({
  onTutup,
  onSimpan,
}: {
  onTutup: () => void;
  onSimpan: (r: { dibuat: number; dilewati: number }) => void;
}) {
  const [santri, setSantri] = useState<PilihanSantri[]>([]),
    [scope, setScope] = useState("santri"),
    [target, setTarget] = useState(""),
    [nominal, setNominal] = useState(""),
    [galat, setGalat] = useState(""),
    [sibuk, setSibuk] = useState(false),
    [siap, setSiap] = useState(false);
  const key = useRef(""),
    kunci = useRef(false);
  useEffect(() => {
    let hidup = true;
    santriTagihan()
      .then((r) => {
        if (hidup) {
          setSantri(r);
          setSiap(true);
        }
      })
      .catch((e) => {
        if (hidup) setGalat(e.message);
      });
    return () => {
      hidup = false;
    };
  }, []);
  const kelas = Array.from(
      new Map(santri.map((s) => [s.kelas_id, s.kelas_nama])).entries(),
    ),
    ids = santri
      .filter(
        (s) =>
          scope === "semua" ||
          (scope === "kelas" ? s.kelas_id === target : s.id === target),
      )
      .map((s) => s.id);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (kunci.current) return;
    setGalat("");
    try {
      const f = new FormData(e.currentTarget);
      if (!key.current) key.current = crypto.randomUUID();
      const d: TagihanBaru = {
        kunci: key.current,
        santri_ids: ids,
        judul: String(f.get("judul")),
        jenis: String(f.get("jenis")) as JenisTagihan,
        periode: String(f.get("periode")) + "-01",
        nominal: angkaRupiah(nominal),
        jatuh_tempo: String(f.get("jatuh_tempo")),
        catatan: String(f.get("catatan")),
      };
      validasiTagihan(d);
      if (
        !window.confirm(
          `Terbitkan tagihan untuk ${ids.length} santri, ${rupiah(d.nominal)} per santri? Tagihan langsung terlihat oleh wali. SPP duplikat akan dilewati.`,
        )
      )
        return;
      kunci.current = true;
      setSibuk(true);
      onSimpan(await terbitkanTagihan(d));
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Tagihan belum diterbitkan.");
    } finally {
      kunci.current = false;
      setSibuk(false);
    }
  }
  return (
    <section className="izin-panel">
      <h2>Terbitkan tagihan</h2>
      <p className="izin-petunjuk">
        Nominal yang sama diterapkan kepada semua santri terpilih. Maksimal 500
        santri per penerbitan. SPP bulan yang sudah aktif akan dilewati.
      </p>
      <form onSubmit={submit}>
        <fieldset disabled={sibuk} className="izin-form">
          <label>
            Sasaran
            <select
              value={scope}
              onChange={(e) => {
                setScope(e.target.value);
                setTarget("");
              }}
            >
              <option value="santri">Satu santri</option>
              <option value="kelas">Satu kelas</option>
              <option value="semua">Semua santri aktif</option>
            </select>
          </label>
          {scope !== "semua" && (
            <label>
              {scope === "kelas" ? "Kelas" : "Santri"}
              <select
                value={target}
                required
                onChange={(e) => setTarget(e.target.value)}
              >
                <option value="">
                  {siap ? "Pilih sasaran" : "Memuat pilihan…"}
                </option>
                {scope === "kelas"
                  ? kelas.map(([id, nama]) => (
                      <option key={id} value={id}>
                        {nama}
                      </option>
                    ))
                  : santri.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama} · {s.kelas_nama}
                      </option>
                    ))}
              </select>
            </label>
          )}
          <label>
            Jenis tagihan
            <select name="jenis">
              {Object.entries(JENIS_TAGIHAN).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            Bulan tagihan
            <input
              name="periode"
              type="month"
              required
              defaultValue={hariWib().slice(0, 7)}
            />
          </label>
          <label>
            Judul tagihan
            <input
              name="judul"
              required
              minLength={3}
              maxLength={160}
              placeholder="Contoh: SPP bulanan"
            />
          </label>
          <label>
            Nominal per santri (Rp)
            <input
              type="number"
              min={1}
              max={1000000000}
              step={1}
              required
              value={nominal}
              onChange={(e) => setNominal(e.target.value)}
              placeholder="Contoh: 500000"
            />
          </label>
          <label>
            Jatuh tempo
            <input type="date" name="jatuh_tempo" required />
          </label>
          <label className="izin-lebar">
            Instruksi pembayaran / catatan
            <textarea
              name="catatan"
              maxLength={2000}
              rows={3}
              placeholder="Isi rekening resmi pondok atau petunjuk pembayaran yang benar."
            />
          </label>
          <div className="spp-pesan izin-lebar">
            {ids.length} santri terpilih
            {nominal && Number.isFinite(Number(nominal))
              ? ` · total rencana ${rupiah(Number(nominal) * ids.length)}`
              : ""}
            {ids.length > 500 &&
              ". Pilih per kelas atau per santri agar tidak melebihi 500."}
          </div>
          {galat && (
            <p role="alert" className="pesan-galat izin-lebar">
              {galat}
            </p>
          )}
          <div className="izin-tindakan izin-lebar">
            <button
              className="tombol tombol-utama"
              disabled={!siap || ids.length < 1 || ids.length > 500}
              type="submit"
            >
              {sibuk ? "Menerbitkan…" : "Terbitkan tagihan"}
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
