-- The application currently has no child-table foreign keys except provider_snapshots.
-- Current Neon profiling found no orphan rows, so these constraints can be added safely.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'prompts_client_id_fkey') then
    alter table prompts add constraint prompts_client_id_fkey
      foreign key (client_id) references clients(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'brand_memories_client_id_fkey') then
    alter table brand_memories add constraint brand_memories_client_id_fkey
      foreign key (client_id) references clients(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'aeo_contents_client_id_fkey') then
    alter table aeo_contents add constraint aeo_contents_client_id_fkey
      foreign key (client_id) references clients(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'run_cycles_client_id_fkey') then
    alter table run_cycles add constraint run_cycles_client_id_fkey
      foreign key (client_id) references clients(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'runs_client_id_fkey') then
    alter table runs add constraint runs_client_id_fkey
      foreign key (client_id) references clients(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'runs_cycle_id_fkey') then
    alter table runs add constraint runs_cycle_id_fkey
      foreign key (cycle_id) references run_cycles(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'runs_prompt_id_fkey') then
    alter table runs add constraint runs_prompt_id_fkey
      foreign key (prompt_id) references prompts(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'diagnostics_client_id_fkey') then
    alter table diagnostics add constraint diagnostics_client_id_fkey
      foreign key (client_id) references clients(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'diagnostics_prompt_id_fkey') then
    alter table diagnostics add constraint diagnostics_prompt_id_fkey
      foreign key (prompt_id) references prompts(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'diagnostics_cycle_id_fkey') then
    alter table diagnostics add constraint diagnostics_cycle_id_fkey
      foreign key (cycle_id) references run_cycles(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'actions_client_id_fkey') then
    alter table actions add constraint actions_client_id_fkey
      foreign key (client_id) references clients(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'actions_diagnostic_id_fkey') then
    alter table actions add constraint actions_diagnostic_id_fkey
      foreign key (diagnostic_id) references diagnostics(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'page_analyses_client_id_fkey') then
    alter table page_analyses add constraint page_analyses_client_id_fkey
      foreign key (client_id) references clients(id) on delete cascade;
  end if;
end $$;

create index if not exists prompts_owner_client_created_idx on prompts (owner_id, client_id, created_at);
create index if not exists runs_owner_client_at_idx on runs (owner_id, client_id, run_at desc);
create index if not exists diagnostics_owner_client_created_idx on diagnostics (owner_id, client_id, created_at desc);
create index if not exists actions_owner_client_created_idx on actions (owner_id, client_id, created_at desc);
create index if not exists brand_memories_client_updated_idx on brand_memories (client_id, updated_at desc);
create index if not exists page_analyses_owner_client_at_idx on page_analyses (owner_id, client_id, analyzed_at desc);
