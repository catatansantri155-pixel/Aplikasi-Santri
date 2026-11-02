import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Klien Supabase untuk Server Components / Route Handlers.
 * Sesi dibaca dari cookie; kebijakan RLS berbasis auth.uid() tetap berlaku
 * karena klien ini memakai kunci anon + token sesi pengguna.
 */
export async function buatKlienServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Dipanggil dari Server Component: cookie tidak bisa ditulis di sini.
            // Penyegaran sesi ditangani middleware (tahap berikutnya).
          }
        },
      },
    },
  );
}
