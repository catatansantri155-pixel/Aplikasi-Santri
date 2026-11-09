"use client";
import { RangkaKartu, Putaran } from "@/components/Muat";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Ikon } from "@/components/Ikon";
import KartuInformasi from "@/components/KartuInformasi";
import {
  ambilDetailInformasi,
  ringkasanBacaan,
  type DetailInformasi as Data,
} from "@/lib/data/informasi";
import { tandaiInformasi } from "@/lib/data/notifikasi";
import { ambilProfilLogin } from "@/lib/sesi";
export default function DetailInformasi({ id }: { id: string }) {
  const [data, setData] = useState<Data | null>(null),
    [memuat, setMemuat] = useState(true),
    [galat, setGalat] = useState(""),
    [galatBaca, setGalatBaca] = useState(""),
    [ulang, setUlang] = useState(0),
    [menyimpan, setMenyimpan] = useState(false),
    [admin, setAdmin] = useState(false),
    [stat, setStat] = useState<{ dibaca: number; dikonfirmasi: number } | null>(
      null,
    );
  useEffect(() => {
    let aktif = true;
    setMemuat(true);
    setGalat("");
    setGalatBaca("");
    setData(null);
    setStat(null);
    Promise.all([ambilDetailInformasi(id), ambilProfilLogin()])
      .then(async ([d, p]) => {
        if (!aktif) return;
        setData(d);
        setAdmin(p?.peran === "admin");
        setMemuat(false);
        if (d?.untuk_saya) {
          try {
            await tandaiInformasi(id, d.revisi ?? 1);
            if (aktif)
              setData((v) =>
                v
                  ? {
                      ...v,
                      dibaca_pada: v.dibaca_pada ?? new Date().toISOString(),
                    }
                  : v,
              );
          } catch (e) {
            if (aktif)
              setGalatBaca(
                e instanceof Error ? e.message : "Status baca belum tersimpan.",
              );
          }
        }
        if (d && p?.peran === "admin") {
          try {
            const s = await ringkasanBacaan(id, d.revisi ?? 1);
            if (aktif) setStat(s);
          } catch {
            /* Tidak menghalangi pembacaan pengumuman. */
          }
        }
      })
      .catch((e) => {
        if (aktif) {
          setGalat(e.message);
          setMemuat(false);
        }
      });
    return () => {
      aktif = false;
    };
  }, [id, ulang]);
  async function konfirmasi() {
    if (!data || menyimpan) return;
    setMenyimpan(true);
    setGalatBaca("");
    try {
      await tandaiInformasi(id, data.revisi ?? 1, true);
      const baru = await ambilDetailInformasi(id);
      setData(baru);
      if (admin && baru) setStat(await ringkasanBacaan(id, baru.revisi ?? 1));
    } catch (e) {
      setGalatBaca(
        e instanceof Error ? e.message : "Konfirmasi belum tersimpan.",
      );
    } finally {
      setMenyimpan(false);
    }
  }
  return (
    <section className="detail-informasi">
      <Link
        className="tombol tombol-sekunder aksi-media detail-kembali"
        href="/informasi"
      >
        <Ikon nama="panah-kiri" ukuran={18} /> Kembali ke informasi pondok
      </Link>
      <h1 className="judul-halaman">Informasi pondok</h1>
      {memuat ? (
        <RangkaKartu />
      ) : galat ? (
        <p className="pesan-galat" role="alert">
          {galat}{" "}
          <button
            className="tombol tombol-sekunder aksi-media"
            type="button"
            onClick={() => setUlang((n) => n + 1)}
          >
            Coba lagi
          </button>
        </p>
      ) : !data ? (
        <div className="informasi-kosong">
          <strong>Informasi tidak tersedia.</strong>
          <p>
            Informasi mungkin sudah berakhir, ditarik, atau tidak ditujukan
            kepada akun Anda.
          </p>
        </div>
      ) : (
        <>
          {!data.untuk_saya && admin && (
            <p className="catatan-kaki">
              Pratinjau admin · informasi ini tidak masuk ke notifikasi akun
              Anda.
            </p>
          )}
          <KartuInformasi data={data} />
          {data.untuk_saya && (
            <div className="informasi-konfirmasi">
              {data.wajib_konfirmasi ? (
                data.dikonfirmasi_pada ? (
                  <p role="status">
                    Anda sudah mengonfirmasi telah memahami informasi ini.
                  </p>
                ) : (
                  <>
                    <p>
                      Pondok meminta konfirmasi bahwa Anda telah membaca dan
                      memahami informasi di atas.
                    </p>
                    <button
                      type="button"
                      className="tombol"
                      disabled={menyimpan}
                      onClick={() => void konfirmasi()}
                    >
                      {menyimpan && <Putaran />}{" "}
                      {menyimpan
                        ? "Menyimpan…"
                        : "Saya sudah membaca dan memahami"}
                    </button>
                  </>
                )
              ) : data.dibaca_pada ? (
                <p>Sudah dibaca.</p>
              ) : null}
            </div>
          )}
          {galatBaca && (
            <p className="pesan-galat" role="alert">
              {galatBaca}{" "}
              <button
                className="tombol tombol-sekunder aksi-media"
                type="button"
                onClick={() => setUlang((n) => n + 1)}
              >
                Muat ulang informasi
              </button>
            </p>
          )}
          {admin && (
            <div className="informasi-konfirmasi">
              <h2>Ringkasan pembacaan</h2>
              {stat ? (
                <p>
                  {stat.dibaca} akun sudah membaca · {stat.dikonfirmasi} akun
                  mengonfirmasi versi ini.
                </p>
              ) : (
                <p className="catatan-kaki">
                  Ringkasan belum tersedia.{" "}
                  <button
                    className="tombol tombol-sekunder aksi-media"
                    type="button"
                    onClick={() => setUlang((n) => n + 1)}
                  >
                    Muat ulang
                  </button>
                </p>
              )}
              <Link
                className="tombol tombol-sekunder aksi-media"
                href="/informasi"
              >
                <Ikon nama="pengaturan" ukuran={18} />
                Kelola informasi
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}
