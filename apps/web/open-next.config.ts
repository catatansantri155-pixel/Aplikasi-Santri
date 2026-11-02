// Konfigurasi OpenNext untuk Cloudflare (@opennextjs/cloudflare).
// Adapter ini yang dipakai untuk deploy Next.js 16 ke Cloudflare Workers:
// @cloudflare/next-on-pages sudah deprecated dan hanya mendukung Next <= 15.5.2.
//
// Konfigurasi sengaja minimal (tanpa cache R2): halaman aplikasi ini dinamis
// (data Supabase per pengguna, RLS), sehingga cache inkremental R2 belum
// diperlukan. Bila nanti dibutuhkan, ikuti https://opennext.js.org/cloudflare/caching
// dan buat bucket R2 lebih dulu sebelum deploy.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();
