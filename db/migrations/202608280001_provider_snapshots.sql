create table if not exists provider_snapshots (
  id text primary key,
  owner_id text not null,
  client_id text not null references clients(id) on delete cascade,
  provider text not null check (provider in (
    'gemini-grounded',
    'ubersuggest-ai-visibility',
    'otterly',
    'ahrefs-ai-citations',
    'firecrawl'
  )),
  status text not null check (status in (
    'available',
    'not_configured',
    'unavailable',
    'failed'
  )),
  captured_at timestamptz not null,
  prompt_set_fingerprint text,
  prompt_count integer check (prompt_count is null or prompt_count >= 0),
  runs_per_prompt integer check (runs_per_prompt is null or runs_per_prompt between 1 and 5),
  engine_label text,
  metrics jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  source_url text,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists provider_snapshots_owner_client_captured_idx
  on provider_snapshots (owner_id, client_id, captured_at desc);

create index if not exists provider_snapshots_client_provider_captured_idx
  on provider_snapshots (client_id, provider, captured_at desc);
