"use client";
import { Ikon } from "@/components/Ikon";
import { arsipPondok } from "@/lib/data/pondok-layanan";
import PenerimaInformasi from "@/components/PenerimaInformasi";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  TEMPLATE_INFORMASI,
  TEMA_INFORMASI,
  type TemaInformasi,
} from "@/lib/template-informasi";
import {
  unggahGambarInformasi,
  hapusUnggahanBelumTerpakai,
  validasiBerkasGambar,
} from "@/lib/data/gambar-informasi";
import KartuInformasi from "@/components/KartuInformasi";
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
    tema: "hijau",
    gambar_path: null,
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
  const [berkas, setBerkas] = useState<File | null>(null);
  const [gambarLama, setGambarLama] = useState<string>();
  const [pratinjau, setPratinjau] = useState<string>();
  const [template, setTemplate] = useState("");
  const [arsip, setArsip] = useState(false);
  useEffect(() => {
    if (!berkas) {
      setPratinjau(undefined);
      return;
    }
    const url = URL.createObjectURL(berkas);
    setPratinjau(url);
    return () => URL.revokeObjectURL(url);
  }, [berkas]);
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
    ambilInformasi({ filter, halaman, ringkas, arsip })
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
  }, [filter, halaman, ringkas, peran, ulangan, arsip]);
  useEffect(() => {
    if (!editor) return;
    const form = document.getElementById("editor-informasi");
    form?.scrollIntoView({ block: "start" });
    form
      ?.querySelector<HTMLInputElement>("input")
      ?.focus({ preventScroll: true });
  }, [editor, id]);
  useEffect(() => {
    if (ringkas || memuat || !baris.length) return;
    const target = window.location.hash.slice(1);
    if (target.startsWith("info-"))
      document.getElementById(target)?.scrollIntoView({ block: "start" });
  }, [baris, memuat, ringkas]);
  const admin = peran === "admin";
  async function simpan(e: FormEvent) {
    e.preventDefault();
    if (!admin || menyimpan) return;
    setMenyimpan(true);
    setGalat("");
    setSukses("");
    let unggahanBaru: string | undefined;
    try {
      if (berkas) unggahanBaru = await unggahGambarInformasi(berkas);
      await simpanInformasi(
        { ...isian, gambar_path: unggahanBaru ?? isian.gambar_path },
        id,
      );
      setSukses(
        isian.status === "terbit"
          ? "Informasi diterbitkan untuk penerima yang dipilih."
          : "Draf tersimpan.",
      );
      setEditor(false);
      setArsip(false);
      setBerkas(null);
      setGambarLama(undefined);
      setId(undefined);
      setIsian(kosong());
      setHalaman(0);
      setUlangan((n) => n + 1);
    } catch (e) {
      if (unggahanBaru)
        await hapusUnggahanBelumTerpakai(unggahanBaru).catch(() => {});
      setGalat(e instanceof Error ? e.message : "Gagal menyimpan informasi.");
    } finally {
      setMenyimpan(false);
    }
  }
  async function hapusInfo(b: Baris, pulihkan = false) {
    if (typeof b.revisi !== "number") {
      setGalat("Muat ulang informasi sebelum menghapus.");
      return;
    }
    if (
      menyimpan ||
      !window.confirm(
        pulihkan
          ? "Pulihkan informasi sebagai draf? Periksa kembali sebelum menerbitkan."
          : "Hapus informasi ini dari tampilan? Informasi dapat dipulihkan melalui Arsip.",
      )
    )
      return;
    setMenyimpan(true);
    setGalat("");
    try {
      await arsipPondok("informasi", b.id, b.revisi, pulihkan);
      setHalaman(0);
      setUlangan((n) => n + 1);
      setSukses(
        pulihkan
          ? "Informasi dipulihkan sebagai draf."
          : "Informasi dipindahkan ke arsip.",
      );
      setEditor(false);
    } catch (e) {
      setGalat(
        e instanceof Error ? e.message : "Informasi belum dapat diubah.",
      );
    } finally {
      setMenyimpan(false);
    }
  }
  return (
    <section
      className={`informasi-pondok${ringkas ? " informasi-ringkas" : ""}`}
      aria-label="Informasi terbaru dari pondok"
      data-panduan="informasi"
    >
      <div className="beranda-kepala-seksi">
        <h2>
          {ringkas ? "Informasi Terbaru dari Pondok" : "Informasi Pondok"}
        </h2>
        {ringkas ? (
          <Link
            href="/informasi"
            className="aksi-ringkas"
            data-panduan="kelola-informasi"
          >
            <Ikon nama={admin ? "pengaturan" : "catatan"} ukuran={16} />
            {admin ? "Kelola" : "Semua info"}
          </Link>
        ) : admin ? (
          <button
            type="button"
            className="tombol tombol-kecil"
            disabled={menyimpan}
            onClick={() => {
              setId(undefined);
              setBerkas(null);
              setGambarLama(undefined);
              setTemplate("");
              setIsian(kosong());
              setEditor(true);
              setGalat("");
            }}
          >
            Buat informasi
          </button>
        ) : null}
      </div>
      {!ringkas && admin && (
        <div className="info-tab" role="group" aria-label="Tampilan informasi">
          <button
            type="button"
            className="tombol tombol-sekunder"
            aria-pressed={!arsip}
            disabled={menyimpan}
            onClick={() => {
              setArsip(false);
              setHalaman(0);
              setEditor(false);
            }}
          >
            Aktif
          </button>
          <button
            type="button"
            className="tombol tombol-sekunder"
            aria-pressed={arsip}
            disabled={menyimpan}
            onClick={() => {
              setArsip(true);
              setHalaman(0);
              setEditor(false);
            }}
          >
            Arsip
          </button>
        </div>
      )}
      {!ringkas && (
        <>
          <p className="catatan-kaki">
            Pengumuman resmi pondok sesuai akses dan penerima akun Anda.
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
          <fieldset className="informasi-editor-bidang" disabled={menyimpan}>
            <h3>{id ? "Ubah informasi" : "Informasi baru"}</h3>
            <fieldset className="informasi-template" disabled={menyimpan}>
              <legend>Mulai dari template</legend>
              <p>
                Pilih contoh, lalu sesuaikan judul dan isi di bawah. Pilihan ini
                belum mengubah tulisan Anda.
              </p>
              <div className="informasi-form-baris">
                <label>
                  Template teks
                  <select
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                  >
                    <option value="">Pilih template…</option>
                    {TEMPLATE_INFORMASI.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nama}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="tombol tombol-sekunder"
                  disabled={!template}
                  onClick={() => {
                    const t = TEMPLATE_INFORMASI.find((t) => t.id === template);
                    if (
                      t &&
                      (!(isian.judul || isian.isi) ||
                        window.confirm(
                          "Ganti judul dan isi dengan template? Tulisan saat ini akan diganti.",
                        ))
                    )
                      setIsian({
                        ...isian,
                        judul: t.judul,
                        isi: t.isi,
                        kategori: t.kategori,
                        tema: t.tema,
                      });
                  }}
                >
                  Gunakan template
                </button>
              </div>
              <label>
                Latar kartu
                <select
                  value={isian.tema ?? "hijau"}
                  onChange={(e) =>
                    setIsian({
                      ...isian,
                      tema: e.target.value as TemaInformasi,
                    })
                  }
                >
                  {TEMA_INFORMASI.map((t) => (
                    <option key={t} value={t}>
                      {t === "hijau"
                        ? "Hijau · Pengumuman"
                        : t === "emas"
                          ? "Emas · Kegiatan"
                          : "Biru · Jadwal"}
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>
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
            <div className="informasi-unggah">
              <label>
                Gambar / poster (opsional)
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={menyimpan}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      validasiBerkasGambar(file);
                      setBerkas(file);
                      setGalat("");
                    } catch (err) {
                      setGalat(
                        err instanceof Error
                          ? err.message
                          : "Gambar tidak valid.",
                      );
                      e.target.value = "";
                    }
                  }}
                />
              </label>
              <p className="catatan-kaki">
                JPG, PNG, atau WebP · maksimal 5 MB. Poster boleh sudah berisi
                tulisan. Isi teks di bawah boleh dikosongkan jika memakai
                gambar.
              </p>
              {(pratinjau || gambarLama) && (
                <button
                  type="button"
                  className="tombol tombol-kecil tombol-sekunder"
                  disabled={menyimpan}
                  onClick={() => {
                    setBerkas(null);
                    setGambarLama(undefined);
                    setIsian({ ...isian, gambar_path: null });
                    const input = document.querySelector<HTMLInputElement>(
                      '#editor-informasi input[type="file"]',
                    );
                    if (input) input.value = "";
                  }}
                >
                  Hapus gambar dari informasi
                </button>
              )}
            </div>
            <label>
              Isi
              <textarea
                value={isian.isi}
                rows={6}
                minLength={berkas || isian.gambar_path ? undefined : 10}
                maxLength={12000}
                required={!berkas && !isian.gambar_path}
                onChange={(e) => setIsian({ ...isian, isi: e.target.value })}
              />
            </label>
            <PenerimaInformasi nilai={isian} onUbah={setIsian} />
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
                <option value="terbit">
                  Terbit — sesuai penerima terpilih
                </option>
              </select>
            </label>
            <p className="catatan-kaki">
              Mengubah status menjadi draf menarik informasi dari tampilan akun
              lain.
            </p>
            <div className="informasi-preview">
              <small>Pratinjau kartu</small>
              <KartuInformasi
                data={{
                  ...isian,
                  id: "pratinjau",
                  judul: isian.judul || "Judul informasi",
                  tema: isian.tema ?? "hijau",
                  gambar_path: isian.gambar_path ?? null,
                  gambar_url: pratinjau ?? gambarLama,
                  created_at: "",
                  updated_at: "",
                }}
              />
            </div>
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
          </fieldset>
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
          <KartuInformasi
            key={b.id}
            data={b}
            ringkas={ringkas}
            tautanDetail
            sibuk={menyimpan}
            onHapus={
              !ringkas && admin && !arsip ? () => void hapusInfo(b) : undefined
            }
            onPulihkan={
              !ringkas && admin && arsip
                ? () => void hapusInfo(b, true)
                : undefined
            }
            onUbah={
              !ringkas && admin && !arsip && !menyimpan
                ? () => {
                    setId(b.id);
                    setBerkas(null);
                    setGambarLama(b.gambar_url);
                    setTemplate("");
                    setIsian({
                      sasaran: b.sasaran,
                      sasaran_peran: b.sasaran_peran,
                      sasaran_id: b.sasaran_id,
                      disematkan: b.disematkan,
                      berakhir_pada: b.berakhir_pada,
                      wajib_konfirmasi: b.wajib_konfirmasi,
                      judul: b.judul,
                      isi: b.isi,
                      kategori: b.kategori,
                      status: b.status,
                      tanggal: b.tanggal,
                      tema: b.tema,
                      gambar_path: b.gambar_path,
                    });
                    setEditor(true);
                    setSukses("");
                  }
                : undefined
            }
          />
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
