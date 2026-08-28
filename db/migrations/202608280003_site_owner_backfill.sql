-- The Sites runtime authenticates the designated internal account as
-- site:<normalized-email>. Backfill the pre-Sites seed rows to that stable
-- owner key so the new owner-scoped queries do not hide existing workspace
-- data from the only authorized account.
update clients
set owner_id = 'site:bora.kurum@gmail.com'
where owner_id in ('default-owner', 'user-snacksforparty');

update prompts
set owner_id = 'site:bora.kurum@gmail.com'
where owner_id in ('default-owner', 'user-snacksforparty');

-- brand_memories is owned through its client_id foreign key; the table does
-- not have a separate owner_id column, so transferring the clients above
-- transfers its visibility without rewriting the memory rows.

update actions
set owner_id = 'site:bora.kurum@gmail.com'
where owner_id in ('default-owner', 'user-snacksforparty');

update diagnostics
set owner_id = 'site:bora.kurum@gmail.com'
where owner_id in ('default-owner', 'user-snacksforparty');

update google_integrations
set owner_id = 'site:bora.kurum@gmail.com'
where owner_id in ('default-owner', 'user-snacksforparty');

update page_analyses
set owner_id = 'site:bora.kurum@gmail.com'
where owner_id in ('default-owner', 'user-snacksforparty');

update provider_snapshots
set owner_id = 'site:bora.kurum@gmail.com'
where owner_id in ('default-owner', 'user-snacksforparty');

update run_cycles
set owner_id = 'site:bora.kurum@gmail.com'
where owner_id in ('default-owner', 'user-snacksforparty');

update runs
set owner_id = 'site:bora.kurum@gmail.com'
where owner_id in ('default-owner', 'user-snacksforparty');
