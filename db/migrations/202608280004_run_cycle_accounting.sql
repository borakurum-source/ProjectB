alter table run_cycles add column if not exists expected_run_count integer;
alter table run_cycles add column if not exists expected_call_count integer;
alter table run_cycles add column if not exists completed_run_count integer not null default 0;

update run_cycles
set expected_run_count = coalesce(expected_run_count, 0),
    expected_call_count = coalesce(expected_call_count, 0),
    completed_run_count = coalesce(completed_run_count, 0)
where expected_run_count is null or expected_call_count is null;

create index if not exists run_cycles_owner_client_started_idx
  on run_cycles (owner_id, client_id, started_at desc);
