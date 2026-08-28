-- Ubersuggest, Otterly, and Ahrefs snapshots are intentionally retired.
-- Keep provenance rows for the remaining first-party sources, but reject any
-- future write using a canceled provider at the database boundary.
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'provider_snapshots_provider_check') then
    alter table provider_snapshots drop constraint provider_snapshots_provider_check;
  end if;
end $$;

alter table provider_snapshots
  add constraint provider_snapshots_provider_check
  check (provider in ('gemini-grounded', 'firecrawl'));
