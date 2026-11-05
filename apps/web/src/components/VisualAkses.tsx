/** Ilustrasi yang sama di seluruh alur akun, tanpa manusia atau avatar. */
export default function VisualAkses({
  ringkas = false,
}: {
  ringkas?: boolean;
}) {
  return (
    <div className={`akses-visual${ringkas ? " akses-visual--ringkas" : ""}`}>
      <span className="akses-orbit akses-orbit--satu" aria-hidden="true" />
      <span className="akses-orbit akses-orbit--dua" aria-hidden="true" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/akses-3d.webp"
        width={480}
        height={480}
        alt="Ilustrasi 3D Al-Qur’an di atas rehal, buku, papan kehadiran, dan perisai"
        decoding="async"
        fetchPriority="high"
      />
    </div>
  );
}
