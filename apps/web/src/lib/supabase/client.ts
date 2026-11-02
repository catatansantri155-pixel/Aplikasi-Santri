import { createBrowserClient } from "@supabase/ssr";

/**
 * Klien Supabase untuk komponen browser (Client Components).
 * Memakai kunci anon; semua akses data tetap dibatasi RLS di database.
 */
export function buatKlienBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
