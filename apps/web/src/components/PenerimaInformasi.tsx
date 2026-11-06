"use client";
import { useEffect, useState } from "react";
import { LABEL_PERAN, SEMUA_PERAN } from "@/lib/peran";
import {
  LABEL_SASARAN,
  pilihanSasaran,
  type SasaranInformasi,
} from "@/lib/data/notifikasi";
import type { IsianInformasi } from "@/lib/data/informasi";
export default function PenerimaInformasi({
  nilai,
  onUbah,
}: {
  nilai: IsianInformasi;
  onUbah: (v: IsianInformasi) => void;
}) {
  const [cari, setCari] = useState(""),
    [pilihan, setPilihan] = useState<{ id: string; label: string }[]>([]),
    [galat, setGalat] = useState(""),
    [memuat, setMemuat] = useState(false);
  const mode = nilai.sasaran ?? "semua";
  useEffect(() => {
    let aktif = true;
    setPilihan([]);
    setGalat("");
    if (mode !== "kelas" && mode !== "santri" && mode !== "pengguna") return;
    setMemuat(true);
    const timer = window.setTimeout(() => {
      pilihanSasaran(mode, cari, nilai.sasaran_id ?? undefined)
        .then((p) => {
          if (aktif) setPilihan(p);
        })
        .catch((e) => {
          if (aktif) setGalat(e.message);
        })
        .finally(() => {
          if (aktif) setMemuat(false);
        });
    }, 250);
    return () => {
      aktif = false;
      window.clearTimeout(timer);
    };
  }, [mode, cari, nilai.sasaran_id]);
  return (
    <fieldset className="informasi-template">
      <legend>Penerima & masa tayang</legend>
      <label>
        Sasaran informasi
        <select
          value={mode}
          onChange={(e) => {
            setCari("");
            onUbah({
              ...nilai,
              sasaran: e.target.value as SasaranInformasi,
              sasaran_id: null,
              sasaran_peran: e.target.value === "peran" ? "wali" : null,
            });
          }}
        >
          {Object.entries(LABEL_SASARAN).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      {mode === "peran" && (
        <label>
          Peran penerima
          <select
            value={nilai.sasaran_peran ?? "wali"}
            onChange={(e) =>
              onUbah({ ...nilai, sasaran_peran: e.target.value })
            }
          >
            {SEMUA_PERAN.map((p) => (
              <option key={p} value={p}>
                {LABEL_PERAN[p]}
              </option>
            ))}
          </select>
        </label>
      )}
      {(mode === "kelas" || mode === "santri" || mode === "pengguna") && (
        <>
          <label>
            Cari nama
            <input
              type="search"
              value={cari}
              placeholder="Ketik untuk mencari penerima…"
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault();
              }}
              onChange={(e) => setCari(e.target.value)}
            />
          </label>
          <label>
            {mode === "kelas"
              ? "Pilih kelas"
              : mode === "santri"
                ? "Pilih santri"
                : "Pilih akun"}
            <select
              required
              value={nilai.sasaran_id ?? ""}
              onChange={(e) =>
                onUbah({ ...nilai, sasaran_id: e.target.value || null })
              }
            >
              <option value="">
                {memuat ? "Memuat pilihan…" : "Pilih tujuan…"}
              </option>
              {pilihan.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <p>
            {mode === "pengguna"
              ? "Informasi hanya untuk akun yang dipilih."
              : "Informasi ditujukan kepada akun wali yang tertaut. Jika belum ada tautan, belum ada wali yang menerima."}{" "}
            Maksimal 30 hasil pencarian ditampilkan.
          </p>
          {galat && <p role="alert">{galat}</p>}
        </>
      )}
      <label className="informasi-pilihan-centang">
        <input
          type="checkbox"
          checked={nilai.disematkan ?? false}
          onChange={(e) => onUbah({ ...nilai, disematkan: e.target.checked })}
        />
        Sematkan di urutan atas
      </label>
      <label className="informasi-pilihan-centang">
        <input
          type="checkbox"
          checked={nilai.wajib_konfirmasi ?? false}
          onChange={(e) =>
            onUbah({ ...nilai, wajib_konfirmasi: e.target.checked })
          }
        />
        Minta konfirmasi telah memahami
      </label>
      <label>
        Berakhir pada (opsional)
        <input
          type="datetime-local"
          value={
            nilai.berakhir_pada
              ? (() => {
                  const d = new Date(nilai.berakhir_pada!);
                  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                    .toISOString()
                    .slice(0, 16);
                })()
              : ""
          }
          onChange={(e) =>
            onUbah({
              ...nilai,
              berakhir_pada: e.target.value
                ? new Date(e.target.value).toISOString()
                : null,
            })
          }
        />
      </label>
      <p>
        Tanpa tanggal akhir, informasi tetap tayang sampai ditarik ke draf.
        Informasi yang diterbitkan muncul sebagai notifikasi bagi penerimanya.
        Perubahan isi atau tujuan meminta pembacaan ulang.
      </p>
    </fieldset>
  );
}
