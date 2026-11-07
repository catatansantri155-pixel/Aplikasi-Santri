"use client";
import { PenandaMuat, Putaran } from "@/components/Muat";
import { useEffect, useRef, useState, type FormEvent } from "react";
import KopLayanan from "@/components/KopLayanan";
import FilterPeriode from "@/components/FilterPeriode";
import { Ikon } from "@/components/Ikon";
import { ambilProfilLogin, type ProfilLogin } from "@/lib/sesi";
import {
  ambilDaftarSantri,
  supabaseTerhubung,
  type Santri,
} from "@/lib/data/santri";
import {
  ambilSehat,
  simpanLayanan,
  arsipPondok,
  riwayatSehat,
  type CatatanSehat,
} from "@/lib/data/pondok-layanan";
import { STATUS_SEHAT, validasiKesehatan } from "@/lib/pondok-layanan";
import {
  SEMUA_PERIODE,
  type FilterPeriode as NilaiPeriode,
} from "@/lib/filter-periode";
import { hariWib, tanggalKeuangan } from "@/lib/keuangan";
import { waktuIzin } from "@/lib/perizinan";
function Riwayat({ id }: { id: string }) {
  const [d, setD] = useState<Awaited<ReturnType<typeof riwayatSehat>> | null>(
      null,
    ),
    [galat, setGalat] = useState("");
  async function buka() {
    try {
      setD(await riwayatSehat(id));
      setGalat("");
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Riwayat gagal dimuat.");
    }
  }
  return (
    <div>
      <button onClick={() => (d ? setD(null) : void buka())}>
        {d ? "Tutup riwayat" : "Lihat riwayat perubahan"}
      </button>
      {galat && <p role="alert">{galat}</p>}
      {d && (
        <ol className="izin-lini">
          {d.map((x) => (
            <li key={x.id}>
              <strong>{x.aksi}</strong>
              <span>
                {x.pelaku_nama} · {waktuIzin(x.waktu)}
              </span>
              <small>
                {STATUS_SEHAT[x.status as keyof typeof STATUS_SEHAT]}
              </small>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
export default function KesehatanSantri() {
  const [profil, setProfil] = useState<ProfilLogin | null>(null),
    [anak, setAnak] = useState<Santri[]>([]),
    [d, setD] = useState<{ jumlah: number; data: CatatanSehat[] } | null>(null),
    [periode, setPeriode] = useState<NilaiPeriode>(SEMUA_PERIODE),
    [status, setStatus] = useState("semua"),
    [cari, setCari] = useState(""),
    [kata, setKata] = useState(""),
    [hal, setHal] = useState(0),
    [arsip, setArsip] = useState(false),
    [ulang, setUlang] = useState(0),
    [muat, setMuat] = useState(true),
    [galat, setGalat] = useState(""),
    [editor, setEditor] = useState<CatatanSehat | null | undefined>(),
    [sibuk, setSibuk] = useState(false);
  const key = useRef(""),
    lock = useRef(false);
  const petugas = profil?.peran === "admin" || profil?.peran === "musyrif",
    admin = profil?.peran === "admin";
  useEffect(() => {
    let aktif = true;
    ambilProfilLogin()
      .then(async (p) => {
        if (!aktif) return;
        setProfil(p);
        if (p?.peran === "admin" || p?.peran === "musyrif") {
          const a = await ambilDaftarSantri();
          if (aktif) setAnak(a.data);
        }
      })
      .catch(() => {
        if (aktif) setGalat("Profil atau daftar santri belum dapat dimuat.");
      });
    return () => {
      aktif = false;
    };
  }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      setKata(cari);
      setHal(0);
    }, 300);
    return () => clearTimeout(t);
  }, [cari]);
  useEffect(() => {
    let aktif = true;
    setMuat(true);
    setD(null);
    setGalat("");
    if (!supabaseTerhubung()) {
      setMuat(false);
      return;
    }
    ambilSehat(periode, status, kata, arsip, hal)
      .then((x) => {
        if (aktif) setD(x);
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
  }, [periode, status, kata, arsip, hal, ulang]);
  function buka(x: CatatanSehat | null) {
    key.current = x?.kunci ?? crypto.randomUUID();
    setEditor(x);
    setGalat("");
  }
  async function simpan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (lock.current) return;
    const f = new FormData(e.currentTarget);
    try {
      const v = {
        kunci: key.current,
        santri_id: editor?.santri_id ?? String(f.get("santri_id")),
        tanggal: String(f.get("tanggal")),
        keluhan: String(f.get("keluhan")),
        tindakan: String(f.get("tindakan")),
        rujukan: String(f.get("rujukan")),
        status: String(f.get("status")),
      };
      validasiKesehatan(v, hariWib());
      lock.current = true;
      setSibuk(true);
      await simpanLayanan(
        "kesehatan",
        v,
        editor?.id ?? null,
        editor?.revisi ?? 0,
      );
      setEditor(undefined);
      setUlang((n) => n + 1);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Catatan belum tersimpan.");
    } finally {
      lock.current = false;
      setSibuk(false);
    }
  }
  async function hapus(x: CatatanSehat) {
    if (
      lock.current ||
      !window.confirm(
        arsip
          ? "Pulihkan catatan kesehatan ini? Wali anak yang tertaut dapat melihatnya kembali."
          : "Hapus catatan dari tampilan? Riwayat tetap tersimpan dan catatan dapat dipulihkan dari Arsip.",
      )
    )
      return;
    lock.current = true;
    setSibuk(true);
    try {
      await arsipPondok("kesehatan", x.id, x.revisi, arsip);
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
        judul="Kesehatan Santri"
        kategori="Pemantauan & penanganan"
        keterangan="Catatan kondisi dan penanganan yang dilakukan petugas pondok."
        gambar="/images/fitur/kesehatan.webp"
        aksi={
          petugas ? (
            <button
              className="tombol tombol-utama"
              onClick={() =>
                editor !== undefined ? setEditor(undefined) : buka(null)
              }
            >
              {editor !== undefined ? "Tutup formulir" : "Catat kesehatan"}
            </button>
          ) : undefined
        }
      />
      {editor !== undefined && petugas && (
        <section className="izin-panel" key={editor?.id ?? "baru"}>
          <h2>{editor ? "Perbarui catatan" : "Catatan kesehatan baru"}</h2>
          <form onSubmit={simpan}>
            <fieldset className="izin-form" disabled={sibuk}>
              <label>
                Santri
                <select
                  name="santri_id"
                  required
                  defaultValue={editor?.santri_id ?? ""}
                  disabled={!!editor}
                >
                  <option value="">Pilih santri aktif</option>
                  {editor && !anak.some((a) => a.id === editor.santri_id) && (
                    <option value={editor.santri_id}>
                      {editor.santri_nama}
                    </option>
                  )}
                  {anak.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nama} · {a.kelasNama}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tanggal
                <input
                  name="tanggal"
                  type="date"
                  required
                  max={hariWib()}
                  defaultValue={editor?.tanggal ?? hariWib()}
                />
              </label>
              <label>
                Status
                <select
                  name="status"
                  defaultValue={editor?.status ?? "dipantau"}
                >
                  {Object.entries(STATUS_SEHAT).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="izin-lebar">
                Keluhan / kondisi yang dilaporkan
                <textarea
                  name="keluhan"
                  required
                  minLength={5}
                  maxLength={2000}
                  rows={3}
                  defaultValue={editor?.keluhan}
                />
              </label>
              <label className="izin-lebar">
                Penanganan yang sudah dilakukan
                <textarea
                  name="tindakan"
                  maxLength={2000}
                  rows={3}
                  defaultValue={editor?.tindakan}
                />
              </label>
              <label className="izin-lebar">
                Fasilitas / keterangan rujukan (jika ada)
                <input
                  name="rujukan"
                  maxLength={300}
                  defaultValue={editor?.rujukan}
                />
              </label>
              {galat && (
                <p className="pesan-galat izin-lebar" role="alert">
                  {galat}
                </p>
              )}
              <div className="izin-tindakan izin-lebar">
                <button type="submit" className="tombol tombol-utama">
                  {sibuk && <Putaran />} {sibuk ? "Menyimpan…" : "Simpan catatan"}
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
          <h2>Catatan kesehatan</h2>
          <button
            className="layanan-refresh"
            aria-label="Muat ulang kesehatan"
            disabled={muat}
            onClick={() => setUlang((v) => v + 1)}
          >
            <Ikon nama="muat-ulang" ukuran={18} />
          </button>
        </div>
        <div className="izin-filter">
          <label className="layanan-pencarian">
            Cari santri / keluhan
            <input
              type="search"
              maxLength={100}
              value={cari}
              onChange={(e) => setCari(e.target.value)}
            />
          </label>
          <label>
            Status
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setHal(0);
              }}
            >
              <option value="semua">Semua kondisi</option>
              {Object.entries(STATUS_SEHAT).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <FilterPeriode
            nilai={periode}
            onUbah={(v) => {
              setPeriode(v);
              setHal(0);
            }}
          />
          {admin && (
            <label>
              Tampilan
              <select
                value={arsip ? "arsip" : "aktif"}
                onChange={(e) => {
                  setArsip(e.target.value === "arsip");
                  setHal(0);
                }}
              >
                <option value="aktif">Catatan aktif</option>
                <option value="arsip">Arsip</option>
              </select>
            </label>
          )}
        </div>
        <p className="izin-petunjuk">
          Wali hanya melihat catatan anak yang tertaut. Filter berdasarkan
          tanggal pencatatan.
        </p>
        {muat && <PenandaMuat teks="Memuat catatan…" />}
        {galat && (
          <p role="alert" className="pesan-galat">
            {galat}
          </p>
        )}
        {!muat && !galat && !d?.data.length && (
          <div className="izin-kosong">
            <h2>Belum ada catatan pada pilihan ini</h2>
            <p>Catatan dari petugas akan tampil sesuai akses akun Anda.</p>
          </div>
        )}
        <div className="pondok-daftar">
          {d?.data.map((x) => (
            <article className="pondok-kartu" key={x.id}>
              <div className="izin-item-kop">
                <strong>{x.santri_nama}</strong>
                <span className={`pondok-chip sehat-${x.status}`}>
                  {STATUS_SEHAT[x.status]}
                </span>
              </div>
              <p>
                <small>
                  {x.kelas_nama} · {tanggalKeuangan(x.tanggal)}
                </small>
              </p>
              <h3>Keluhan / kondisi</h3>
              <p className="izin-teks">{x.keluhan}</p>
              {x.tindakan && (
                <>
                  <h3>Penanganan tercatat</h3>
                  <p className="izin-teks">{x.tindakan}</p>
                </>
              )}
              {x.rujukan && (
                <>
                  <h3>Rujukan</h3>
                  <p className="izin-teks">{x.rujukan}</p>
                </>
              )}
              <p className="izin-petunjuk">
                Terakhir dicatat oleh {x.petugas_nama}
              </p>
              <Riwayat key={x.revisi} id={x.id} />
              {petugas && (
                <div className="izin-tindakan">
                  {!arsip && (
                    <button disabled={sibuk} onClick={() => buka(x)}>
                      Ubah catatan
                    </button>
                  )}
                  {admin && (
                    <button
                      disabled={sibuk}
                      className={arsip ? "" : "spp-bahaya"}
                      onClick={() => hapus(x)}
                    >
                      {arsip ? "Pulihkan" : "Hapus"}
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
        {d && d.jumlah > 20 && (
          <nav className="izin-paginasi" aria-label="Halaman catatan kesehatan">
            <button disabled={hal === 0} onClick={() => setHal((n) => n - 1)}>
              Sebelumnya
            </button>
            <span>
              {hal + 1} / {Math.ceil(d.jumlah / 20)}
            </span>
            <button
              disabled={(hal + 1) * 20 >= d.jumlah}
              onClick={() => setHal((n) => n + 1)}
            >
              Berikutnya
            </button>
          </nav>
        )}
      </section>
    </div>
  );
}
