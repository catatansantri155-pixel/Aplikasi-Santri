"use client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { langkahPanduan } from "@/lib/panduan";
import { klaimPanduan } from "@/lib/data/panduan";
import type { Peran } from "@/lib/peran";
import { Ikon } from "@/components/Ikon";
type Sorot = {
  top: number;
  left: number;
  width: number;
  height: number;
  atas: boolean;
};
export default function PanduanAplikasi({
  profil,
  siap,
}: {
  profil: { id?: string; peran: Peran } | null;
  siap: boolean;
}) {
  const [buka, setBuka] = useState(false),
    [indeks, setIndeks] = useState(0),
    [sorot, setSorot] = useState<Sorot | null>(null);
  const dialog = useRef<HTMLDialogElement>(null),
    judul = useRef<HTMLHeadingElement>(null),
    klaim = useRef(new Map<string, Promise<boolean>>()),
    ditayangkan = useRef(new Set<string>());
  const langkah = useMemo(
    () => (profil ? langkahPanduan(profil.peran) : []),
    [profil?.peran],
  );
  useEffect(() => {
    if (!profil?.id || !siap) return;
    let hidup = true;
    const url = new URL(window.location.href);
    if (url.searchParams.get("panduan") === "ulang") {
      url.searchParams.delete("panduan");
      window.history.replaceState(
        window.history.state,
        "",
        url.pathname + url.search + url.hash,
      );
      ditayangkan.current.add(profil.id);
      void klaimPanduan(profil.id).catch(() => {});
      setIndeks(0);
      setBuka(true);
      return;
    }
    if (ditayangkan.current.has(profil.id)) return;
    if (!klaim.current.has(profil.id))
      klaim.current.set(profil.id, klaimPanduan(profil.id));
    klaim.current
      .get(profil.id)!
      .then((pertama) => {
        if (hidup && pertama && !ditayangkan.current.has(profil.id!)) {
          ditayangkan.current.add(profil.id!);
          setIndeks(0);
          setBuka(true);
        }
      })
      .catch(() => {
        /* Gangguan panduan tidak mengunci layanan. Buka manual lewat Akun. */
      });
    return () => {
      hidup = false;
    };
  }, [profil?.id, siap]);
  useEffect(() => {
    if (!buka) return;
    const d = dialog.current,
      fokus =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    if (d && !d.open) d.showModal();
    const lama = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      d?.close();
      document.body.style.overflow = lama;
      fokus?.focus({ preventScroll: true });
    };
  }, [buka]);
  useEffect(() => {
    if (!buka) return;
    const target = langkah[indeks]?.target;
    const selector =
      target === "navigasi"
        ? '[data-panduan="navigasi-pc"], [data-panduan="navigasi-mobile"]'
        : `[data-panduan="${target}"]`;
    const el = target
      ? Array.from(document.querySelectorAll<HTMLElement>(selector)).find(
          (e) =>
            e.getBoundingClientRect().width > 0 &&
            e.getBoundingClientRect().height > 0,
        )
      : null;
    const posisi = () => {
      if (!el) {
        setSorot(null);
        return;
      }
      const r = el.getBoundingClientRect(),
        top = Math.max(8, r.top - 6),
        left = Math.max(8, r.left - 6),
        right = Math.min(innerWidth - 8, r.right + 6),
        bottom = Math.min(innerHeight - 8, r.bottom + 6);
      setSorot(
        bottom > top && right > left
          ? {
              top,
              left,
              width: right - left,
              height: bottom - top,
              atas: (top + bottom) / 2 > innerHeight / 2,
            }
          : null,
      );
    };
    el?.scrollIntoView({
      behavior: "instant",
      block: "center",
      inline: "nearest",
    });
    const frame = requestAnimationFrame(posisi);
    window.addEventListener("resize", posisi);
    window.addEventListener("scroll", posisi, true);
    judul.current?.focus({ preventScroll: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", posisi);
      window.removeEventListener("scroll", posisi, true);
    };
  }, [buka, indeks, langkah]);
  if (!buka || !langkah.length) return null;
  return (
    <dialog
      ref={dialog}
      className="panduan-dialog"
      aria-labelledby="panduan-judul"
      aria-describedby="panduan-isi"
      onCancel={(e) => {
        e.preventDefault();
        setBuka(false);
      }}
    >
      {sorot && (
        <div
          className="panduan-sorot"
          aria-hidden="true"
          style={{
            top: sorot.top,
            left: sorot.left,
            width: sorot.width,
            height: sorot.height,
          }}
        />
      )}
      <div
        className={`panduan-panel${!sorot ? " panduan-tengah" : sorot.atas ? " panduan-atas" : " panduan-bawah"}`}
        style={
          {
            "--kemajuan-panduan": `${((indeks + 1) / langkah.length) * 100}%`,
          } as CSSProperties
        }
      >
        <div className="panduan-atasan">
          <span>
            <Ikon nama="bintang" ukuran={16} /> Kenali aplikasi
          </span>
          <span>
            {indeks + 1} / {langkah.length}
          </span>
        </div>
        <h2 id="panduan-judul" ref={judul} tabIndex={-1}>
          {langkah[indeks].judul}
        </h2>
        <p id="panduan-isi">{langkah[indeks].isi}</p>
        <div className="panduan-progres" aria-hidden="true">
          <span />
        </div>
        <div className="panduan-aksi">
          <button className="panduan-lewati" onClick={() => setBuka(false)}>
            Lewati panduan
          </button>
          <div>
            {indeks > 0 && (
              <button
                className="tombol tombol-sekunder"
                onClick={() => setIndeks((i) => i - 1)}
              >
                Kembali
              </button>
            )}
            <button
              className="tombol"
              onClick={() =>
                indeks === langkah.length - 1
                  ? setBuka(false)
                  : setIndeks((i) => i + 1)
              }
            >
              {indeks === langkah.length - 1 ? "Mulai gunakan" : "Lanjut"}
              <Ikon nama="chevron-kanan" ukuran={16} />
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
