-- Batch internal tidak pernah diakses langsung oleh klien; fungsi definer tetap memakai hak pemilik.
create policy spp_penerbitan_tolak_klien on private.spp_penerbitan for all to authenticated using(false) with check(false);
