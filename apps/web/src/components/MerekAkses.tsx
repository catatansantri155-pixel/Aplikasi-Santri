import Link from "next/link";
import Logo from "@/components/Logo";
export default function MerekAkses() {
  return (
    <Link
      href="/sambutan"
      className="akses-merek"
      aria-label="Monitoring Santri Minhajus Sunnah — perkenalan"
    >
      <span className="akses-logo">
        <Logo ukuran={56} />
      </span>
      <span>
        <strong>Monitoring Santri</strong>
        <small>Minhajus Sunnah · Magelang</small>
      </span>
    </Link>
  );
}
