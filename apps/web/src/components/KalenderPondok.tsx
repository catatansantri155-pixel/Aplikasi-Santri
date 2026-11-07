"use client";
import { PenandaMuat, Putaran } from "@/components/Muat";
import { useEffect, useRef, useState, type FormEvent } from "react";
import KopLayanan from "@/components/KopLayanan";
import { Ikon } from "@/components/Ikon";
import { ambilProfilLogin } from "@/lib/sesi";
import { supabaseTerhubung } from "@/lib/data/santri";
import {
  ambilAgenda,
  pilihanKelas,
  simpanLayanan,
  arsipPondok,
  type Agenda,
} from "@/lib/data/pondok-layanan";
import {
  JENIS_AGENDA,
  geserBulan,
  hariKalender,
  agendaPadaHari,
  validasiAgenda,
} from "@/lib/pondok-layanan";
import { hariWib, bulanTagihan, tanggalKeuangan } from "@/lib/keuangan";
import { isoWib, inputWib, waktuIzin } from "@/lib/perizinan";
export default function KalenderPondok() {
  const [admin, setAdmin] = useState(false),
    [bulan, setBulan] = useState(hariWib().slice(0, 7)),
    [hari, setHari] = useState(""),
    [data, setData] = useState<Agenda[]>([]),
    [kelas, setKelas] = useState<{ id: string; nama: string }[]>([]),
    [arsip, setArsip] = useState(false),
    [muat, setMuat] = useState(true),
    [galat, setGalat] = useState(""),
    [ulang, setUlang] = useState(0),
    [editor, setEditor] = useState<Agenda | null | undefined>(undefined),
    [sibuk, setSibuk] = useState(false);
  const key = useRef(""),
    lock = useRef(false);
  useEffect(() => {
    let aktif = true;
    ambilProfilLogin()
      .then(async (p) => {
        if (!aktif) return;
        setAdmin(p?.peran === "admin");
        if (p?.peran === "admin") {
          const k = await pilihanKelas();
          if (aktif) setKelas(k);
        }
      })
      .catch(() => {
        if (aktif) setGalat("Profil atau kelas belum dapat dimuat.");
      });
    return () => {
      aktif = false;
    };
  }, []);
  useEffect(() => {
    let aktif = true;
    setMuat(true);
    setGalat("");
    setData([]);
    if (!supabaseTerhubung()) {
      setMuat(false);
      return;
    }
    ambilAgenda(bulan, arsip)
      .then((d) => {
        if (aktif) setData(d);
      })
      .catch((e) => {
        if (aktif) setGalat(e.message);
      })
      .finally(() => {
        if (aktif) setMuat(false);
      });
    return () => {
      aktif = false;
    };
  }, [bulan, arsip, ulang]);
  let days: string[] = [];
  try {
    days = hariKalender(bulan);
  } catch {}
  const tampil = hari ? data.filter((d) => agendaPadaHari(d, hari)) : data;
  function buka(a: Agenda | null) {
    key.current = a?.kunci ?? crypto.randomUUID();
    setEditor(a);
    setGalat("");
  }
  async function simpan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (lock.current) return;
    const f = new FormData(e.currentTarget);
    try {
      const d = {
        kunci: key.current,
        judul: String(f.get("judul")),
        deskripsi: String(f.get("deskripsi")),
        lokasi: String(f.get("lokasi")),
        mulai: isoWib(String(f.get("mulai"))),
        selesai: isoWib(String(f.get("selesai"))),
        jenis: String(f.get("jenis")),
        kelas_id: String(f.get("kelas_id")) || null,
      };
      validasiAgenda(d);
      lock.current = true;
      setSibuk(true);
      await simpanLayanan(
        "kalender",
        d,
        editor?.id ?? null,
        editor?.revisi ?? 0,
      );
      setEditor(undefined);
      setUlang((v) => v + 1);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Agenda belum tersimpan.");
    } finally {
      lock.current = false;
      setSibuk(false);
    }
  }
  async function hapus(a: Agenda) {
    if (
      lock.current ||
      !window.confirm(
        arsip
          ? "Pulihkan agenda ini agar kembali terlihat oleh penerimanya?"
          : "Hapus agenda dari kalender? Agenda dapat dipulihkan dari Arsip.",
      )
    )
      return;
    lock.current = true;
    setSibuk(true);
    try {
      await arsipPondok("kalender", a.id, a.revisi, arsip);
      setUlang((v) => v + 1);
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
        judul="Kalender Pondok"
        kategori="Agenda & kegiatan"
        keterangan="Jadwal belajar, kegiatan, libur, dan kunjungan dalam satu kalender."
        gambar="/images/fitur/kalender.webp"
        aksi={
          admin ? (
            <button
              className="tombol tombol-utama"
              onClick={() =>
                editor !== undefined ? setEditor(undefined) : buka(null)
              }
            >
              {editor !== undefined ? "Tutup formulir" : "Tambah agenda"}
            </button>
          ) : undefined
        }
      />
      {editor !== undefined && admin && (
        <section className="izin-panel" key={editor?.id ?? "baru"}>
          <h2>{editor ? "Ubah agenda" : "Agenda baru"}</h2>
          <form onSubmit={simpan}>
            <fieldset className="izin-form" disabled={sibuk}>
              <label className="izin-lebar">
                Judul
                <input
                  name="judul"
                  required
                  minLength={3}
                  maxLength={160}
                  defaultValue={editor?.judul}
                />
              </label>
              <label>
                Mulai (WIB)
                <input
                  name="mulai"
                  required
                  type="datetime-local"
                  defaultValue={
                    editor
                      ? inputWib(editor.mulai)
                      : hari
                        ? hari + "T08:00"
                        : ""
                  }
                />
              </label>
              <label>
                Selesai (WIB)
                <input
                  name="selesai"
                  required
                  type="datetime-local"
                  defaultValue={editor ? inputWib(editor.selesai) : ""}
                />
              </label>
              <label>
                Jenis
                <select name="jenis" defaultValue={editor?.jenis ?? "kegiatan"}>
                  {Object.entries(JENIS_AGENDA).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Penerima
                <select name="kelas_id" defaultValue={editor?.kelas_id ?? ""}>
                  <option value="">Seluruh pondok</option>
                  {kelas.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                    </option>
                  ))}
                </select>
                <small>
                  Agenda kelas hanya terlihat oleh wali anak di kelas tersebut
                  dan staf.
                </small>
              </label>
              <label className="izin-lebar">
                Lokasi
                <input
                  name="lokasi"
                  maxLength={200}
                  defaultValue={editor?.lokasi}
                />
              </label>
              <label className="izin-lebar">
                Keterangan
                <textarea
                  name="deskripsi"
                  maxLength={4000}
                  rows={3}
                  defaultValue={editor?.deskripsi}
                />
              </label>
              {galat && (
                <p className="pesan-galat izin-lebar" role="alert">
                  {galat}
                </p>
              )}
              <div className="izin-tindakan izin-lebar">
                <button type="submit" className="tombol tombol-utama">
                  {sibuk && <Putaran />} {sibuk ? "Menyimpan…" : "Simpan agenda"}
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
          <h2>{bulan ? bulanTagihan(bulan) : "Pilih bulan"}</h2>
          <div className="pondok-aksi">
            <button
              aria-label="Bulan sebelumnya"
              disabled={bulan <= "1900-01"}
              onClick={() => {
                setBulan(geserBulan(bulan, -1));
                setHari("");
              }}
            >
              ‹
            </button>
            <button
              aria-label="Bulan berikutnya"
              disabled={bulan >= "2200-12"}
              onClick={() => {
                setBulan(geserBulan(bulan, 1));
                setHari("");
              }}
            >
              ›
            </button>
          </div>
        </div>
        <div className="izin-filter">
          <label>
            Bulan dan tahun
            <input
              type="month"
              value={bulan}
              min="1900-01"
              max="2200-12"
              onChange={(e) => {
                if (e.target.value) {
                  setBulan(e.target.value);
                  setHari("");
                }
              }}
            />
          </label>
          {admin && (
            <label>
              Tampilan
              <select
                value={arsip ? "arsip" : "aktif"}
                onChange={(e) => {
                  setArsip(e.target.value === "arsip");
                  setHari("");
                }}
              >
                <option value="aktif">Agenda aktif</option>
                <option value="arsip">Arsip</option>
              </select>
            </label>
          )}
          <button
            type="button"
            className="layanan-refresh"
            aria-label="Muat ulang kalender"
            disabled={muat}
            onClick={() => setUlang((v) => v + 1)}
          >
            <Ikon nama="muat-ulang" ukuran={18} />
          </button>
        </div>
        <div className="kal-hari" aria-hidden="true">
          {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Ahd"].map((h) => (
            <span key={h}>{h}</span>
          ))}
        </div>
        <div className="kal-kisi" aria-label="Pilih tanggal">
          {days.map((d) => {
            const n = data.filter((a) => agendaPadaHari(a, d)).length;
            return (
              <button
                key={d}
                aria-label={`${tanggalKeuangan(d)}${n ? `, ${n} agenda` : ""}`}
                aria-pressed={hari === d}
                data-hari-ini={d === hariWib()}
                disabled={d.slice(0, 7) !== bulan}
                onClick={() => setHari(hari === d ? "" : d)}
              >
                <span>{Number(d.slice(-2))}</span>
                {n > 0 && (
                  <small>
                    {n}
                    <span className="kal-titik" />
                  </small>
                )}
              </button>
            );
          })}
        </div>
        <p className="izin-petunjuk">
          Ketuk tanggal untuk menyaring agenda. Semua jam ditampilkan dalam WIB.
        </p>
      </section>
      <section className="izin-panel">
        <div className="layanan-bilah">
          <h2>
            {hari ? `Agenda ${tanggalKeuangan(hari)}` : "Agenda bulan ini"}
          </h2>
          {hari && <button onClick={() => setHari("")}>Semua tanggal</button>}
        </div>
        {muat && <PenandaMuat teks="Memuat agenda…" />}
        {galat && (
          <p className="pesan-galat" role="alert">
            {galat}
          </p>
        )}
        {!muat && !galat && !tampil.length && (
          <p className="catatan-kaki">
            Belum ada agenda {arsip ? "di arsip " : ""}pada pilihan ini.
          </p>
        )}
        <div className="pondok-daftar">
          {tampil.map((a) => (
            <article className="pondok-kartu" key={a.id}>
              <span className="pondok-chip">
                {JENIS_AGENDA[a.jenis as keyof typeof JENIS_AGENDA]}
              </span>
              <h3>{a.judul}</h3>
              <p>
                {waktuIzin(a.mulai)}
                <br />
                sampai {waktuIzin(a.selesai)}
              </p>
              <small>
                {a.kelas_nama || "Seluruh pondok"}
                {a.lokasi ? ` · ${a.lokasi}` : ""}
              </small>
              {a.deskripsi && <p className="izin-teks">{a.deskripsi}</p>}
              {admin && (
                <div className="izin-tindakan">
                  {!arsip && (
                    <button disabled={sibuk} onClick={() => buka(a)}>
                      Ubah
                    </button>
                  )}
                  <button
                    disabled={sibuk}
                    className={arsip ? "" : "spp-bahaya"}
                    onClick={() => hapus(a)}
                  >
                    {arsip ? "Pulihkan" : "Hapus"}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
