"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ambilProfilLogin } from "@/lib/sesi";
import type { Peran } from "@/lib/peran";
import { supabaseTerhubung } from "@/lib/data/santri";
import {
  ambilInformasi,
  simpanInformasi,
  KATEGORI_INFORMASI,
  type InformasiPondok as Baris,
  type IsianInformasi,
} from "@/lib/data/informasi";
import FilterPeriode from "@/components/FilterPeriode";
import {
  SEMUA_PERIODE,
  type FilterPeriode as NilaiFilter,
} from "@/lib/filter-periode";
import { tanggalIsoHariIni } from "@/lib/tanggal";
function kosong(): IsianInformasi {
  return {
    judul: "",
    isi: "",
    kategori: "Pengumuman",
    status: "draf",
    tanggal: tanggalIsoHariIni(),
  };
}
export default function InformasiPondok({
  ringkas = false,
  peran: peranAwal,
}: {
  ringkas?: boolean;
  peran?: Peran | null;
}) {
  const [peran, setPeran] = useState<Peran | null>(peranAwal ?? null);
  const [baris, setBaris] = useState<Baris[]>([]);
  const [jumlah, setJumlah] = useState(0);
  const [halaman, setHalaman] = useState(0);
  const [filter, setFilter] = useState<NilaiFilter>(SEMUA_PERIODE);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");
  const [sukses, setSukses] = useState("");
  const [ulangan, setUlangan] = useState(0);
  const [editor, setEditor] = useState(false);
  const [id, setId] = useState<string>();
  const [isian, setIsian] = useState<IsianInformasi>(kosong);
  const [menyimpan, setMenyimpan] = useState(false);
  useEffect(() => {
    let aktif = true;
    if (peranAwal !== undefined) {
      setPeran(peranAwal);
      return;
    }
    ambilProfilLogin()
      .then((p) => {
        if (aktif) setPeran(p?.peran ?? null);
      })
      .catch(() => {
        if (aktif) setPeran(null);
      });
    return () => {
      aktif = false;
    };
  }, [peranAwal]);
  useEffect(() => {
    let aktif = true;
    setMemuat(true);
    setBaris([]);
    setJumlah(0);
    setGalat("");
    ambilInformasi({ filter, halaman, ringkas })
      .then((r) => {
        if (aktif) {
          setBaris(r.data);
          setJumlah(r.jumlah);
        }
      })
      .catch((e) => {
        if (aktif) {
          setBaris([]);
          setGalat(e instanceof Error ? e.message : "Gagal memuat informasi.");
        }
      })
      .finally(() => {
        if (aktif) setMemuat(false);
      });
    return () => {
      aktif = false;
    };
  }, [filter, halaman, ringkas, peran, ulangan]);
  useEffect(() => {
    if (!editor) return;
    const form = document.getElementById("editor-informasi");
    form?.scrollIntoView({ block: "start" });
    form
      ?.querySelector<HTMLInputElement>("input")
      ?.focus({ preventScroll: true });
  }, [editor, id]);
  const admin = peran === "admin";
  async function simpan(e: FormEvent) {
    e.preventDefault();
    if (!admin || menyimpan) return;
    setMenyimpan(true);
    setGalat("");
    setSukses("");
    try {
      await simpanInformasi(isian, id);
      setSukses(
        isian.status === "terbit"
          ? "Informasi diterbitkan untuk seluruh akun."
          : "Draf tersimpan.",
      );
      setEditor(false);
      setId(undefined);
      setIsian(kosong());
      setHalaman(0);
      setUlangan((n) => n + 1);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal menyimpan informasi.");
    } finally {
      setMenyimpan(false);
    }
  }
  return (
    <section
      className="informasi-pondok"
      aria-label="Informasi terbaru dari pondok"
    >
      <div className="beranda-kepala-seksi">
        <h2>
          {ringkas ? "Informasi Terbaru dari Pondok" : "Informasi Pondok"}
        </h2>
        {ringkas ? (
          <Link href="/informasi">
            {admin ? "Kelola / semua" : "Lihat semua"}
          </Link>
        ) : admin ? (
          <button
            type="button"
            className="tombol tombol-kecil"
            onClick={() => {
              setId(undefined);
              setIsian(kosong());
              setEditor(true);
              setGalat("");
            }}
          >
            Buat informasi
          </button>
        ) : null}
      </div>
      {!ringkas && (
        <>
          <p className="catatan-kaki">
            Pengumuman resmi dari Admin Utama untuk seluruh akun pondok.
          </p>
          <FilterPeriode
            nilai={filter}
            onUbah={(v) => {
              setFilter(v);
              setHalaman(0);
            }}
          />
        </>
      )}
      {!ringkas && editor && admin && (
        <form
          id="editor-informasi"
          className="formulir informasi-editor"
          onSubmit={simpan}
        >
          <h3>{id ? "Ubah informasi" : "Informasi baru"}</h3>
          <label>
            Judul
            <input
              value={isian.judul}
              minLength={3}
              maxLength={150}
              required
              onChange={(e) => setIsian({ ...isian, judul: e.target.value })}
            />
          </label>
          <div className="informasi-form-baris">
            <label>
              Kategori
              <select
                value={isian.kategori}
                onChange={(e) =>
                  setIsian({ ...isian, kategori: e.target.value })
                }
              >
                {KATEGORI_INFORMASI.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
            <label>
              Tanggal informasi
              <input
                type="date"
                value={isian.tanggal}
                required
                onChange={(e) =>
                  setIsian({ ...isian, tanggal: e.target.value })
                }
              />
            </label>
          </div>
          <label>
            Isi
            <textarea
              value={isian.isi}
              rows={6}
              minLength={10}
              maxLength={12000}
              required
              onChange={(e) => setIsian({ ...isian, isi: e.target.value })}
            />
          </label>
          <label>
            Status
            <select
              value={isian.status}
              onChange={(e) =>
                setIsian({
                  ...isian,
                  status: e.target.value as "draf" | "terbit",
                })
              }
            >
              <option value="draf">Draf — hanya Admin Utama</option>
              <option value="terbit">Terbit — terlihat seluruh akun</option>
            </select>
          </label>
          <p className="catatan-kaki">
            Mengubah status menjadi draf menarik informasi dari tampilan akun
            lain.
          </p>
          <div className="informasi-aksi">
            <button
              type="submit"
              className="tombol"
              disabled={menyimpan || !supabaseTerhubung()}
            >
              {menyimpan ? "Menyimpan…" : "Simpan informasi"}
            </button>
            <button
              type="button"
              className="tombol tombol-sekunder"
              disabled={menyimpan}
              onClick={() => setEditor(false)}
            >
              Batal
            </button>
          </div>
        </form>
      )}
      {sukses && (
        <p className="pesan-sukses" role="status">
          {sukses}
        </p>
      )}
      {galat && (
        <div className="pesan-galat" role="alert">
          {galat}{" "}
          <button type="button" onClick={() => setUlangan((n) => n + 1)}>
            Coba muat ulang
          </button>
        </div>
      )}
      {memuat ? (
        <p role="status" className="catatan-kaki">
          Memuat informasi pondok…
        </p>
      ) : !galat && !baris.length ? (
        <div className="informasi-kosong">
          <strong>
            Belum ada informasi
            {filter.mode !== "semua" ? " pada periode ini" : ""}.
          </strong>
          <p>Pengumuman dari pondok akan tampil di sini setelah diterbitkan.</p>
        </div>
      ) : null}
      <div className="informasi-daftar">
        {baris.map((b) => (
          <article className="informasi-kartu" key={b.id}>
            <div className="informasi-meta">
              <span>{b.kategori}</span>
              <time dateTime={b.tanggal}>
                {new Date(`${b.tanggal}T00:00:00`).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </time>
              {b.status === "draf" && <span className="lencana">Draf</span>}
            </div>
            <h3>{b.judul}</h3>
            {ringkas ? (
              <>
                <p className="informasi-cuplik">
                  {b.isi.length > 180 ? `${b.isi.slice(0, 180)}…` : b.isi}
                </p>
                <details className="informasi-baca">
                  <summary>Baca selengkapnya</summary>
                  <p className="informasi-isi">{b.isi}</p>
                </details>
              </>
            ) : (
              <>
                <p id={`info-${b.id}`} className="informasi-isi">
                  {b.isi}
                </p>
                {admin && (
                  <button
                    type="button"
                    className="tombol tombol-kecil tombol-sekunder"
                    onClick={() => {
                      setId(b.id);
                      setIsian({
                        judul: b.judul,
                        isi: b.isi,
                        kategori: b.kategori,
                        status: b.status,
                        tanggal: b.tanggal,
                      });
                      setEditor(true);
                      setSukses("");
                    }}
                  >
                    Ubah informasi
                  </button>
                )}
              </>
            )}
          </article>
        ))}
      </div>
      {!ringkas && !memuat && !galat && jumlah > 20 && (
        <div className="informasi-paginasi">
          <button
            type="button"
            className="tombol tombol-sekunder"
            disabled={halaman === 0}
            onClick={() => setHalaman((n) => n - 1)}
          >
            Sebelumnya
          </button>
          <span>
            {halaman + 1} / {Math.ceil(jumlah / 20)}
          </span>
          <button
            type="button"
            className="tombol tombol-sekunder"
            disabled={(halaman + 1) * 20 >= jumlah}
            onClick={() => setHalaman((n) => n + 1)}
          >
            Berikutnya
          </button>
        </div>
      )}
    </section>
  );
}
