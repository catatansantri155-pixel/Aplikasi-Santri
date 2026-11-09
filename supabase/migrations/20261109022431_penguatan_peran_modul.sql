-- Additional restrictive write policies: existing ownership policies still apply.
create policy hifzh_setoran_peran_insert on public.hifzh_setoran as restrictive for insert to authenticated with check (public.peran_saya() in ('admin','pengajar_hifzh'));
create policy hifzh_setoran_peran_update on public.hifzh_setoran as restrictive for update to authenticated using (public.peran_saya() in ('admin','pengajar_hifzh')) with check (public.peran_saya() in ('admin','pengajar_hifzh'));
create policy hifzh_setoran_peran_delete on public.hifzh_setoran as restrictive for delete to authenticated using (public.peran_saya() in ('admin','pengajar_hifzh'));
create policy hifzh_ujian_peran_insert on public.hifzh_ujian as restrictive for insert to authenticated with check (public.peran_saya() in ('admin','pengajar_hifzh'));
create policy hifzh_ujian_peran_update on public.hifzh_ujian as restrictive for update to authenticated using (public.peran_saya() in ('admin','pengajar_hifzh')) with check (public.peran_saya() in ('admin','pengajar_hifzh'));
create policy hifzh_ujian_peran_delete on public.hifzh_ujian as restrictive for delete to authenticated using (public.peran_saya() in ('admin','pengajar_hifzh'));
create policy diniyyah_nilai_harian_peran_insert on public.diniyyah_nilai_harian as restrictive for insert to authenticated with check (public.peran_saya() in ('admin','pengajar_diniyyah'));
create policy diniyyah_nilai_harian_peran_update on public.diniyyah_nilai_harian as restrictive for update to authenticated using (public.peran_saya() in ('admin','pengajar_diniyyah')) with check (public.peran_saya() in ('admin','pengajar_diniyyah'));
create policy diniyyah_nilai_harian_peran_delete on public.diniyyah_nilai_harian as restrictive for delete to authenticated using (public.peran_saya() in ('admin','pengajar_diniyyah'));
create policy diniyyah_ujian_peran_insert on public.diniyyah_ujian as restrictive for insert to authenticated with check (public.peran_saya() in ('admin','pengajar_diniyyah'));
create policy diniyyah_ujian_peran_update on public.diniyyah_ujian as restrictive for update to authenticated using (public.peran_saya() in ('admin','pengajar_diniyyah')) with check (public.peran_saya() in ('admin','pengajar_diniyyah'));
create policy diniyyah_ujian_peran_delete on public.diniyyah_ujian as restrictive for delete to authenticated using (public.peran_saya() in ('admin','pengajar_diniyyah'));
create policy kehadiran_peran_insert on public.kehadiran as restrictive for insert to authenticated with check (public.apakah_admin() or (public.peran_saya()='pengajar_hifzh' and sesi_jenis='hifzh') or (public.peran_saya()='pengajar_diniyyah' and sesi_jenis='diniyyah'));
notify pgrst,'reload schema';
