create table if not exists public.site_state (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.site_state enable row level security;

drop policy if exists "site_state_select_public" on public.site_state;
create policy "site_state_select_public"
on public.site_state
for select
to anon, authenticated
using (true);

drop policy if exists "site_state_insert_public" on public.site_state;
create policy "site_state_insert_public"
on public.site_state
for insert
to anon, authenticated
with check (true);

drop policy if exists "site_state_update_public" on public.site_state;
create policy "site_state_update_public"
on public.site_state
for update
to anon, authenticated
using (true)
with check (true);

insert into public.site_state (id, payload)
values (
  'global',
  '{
    "admin": {
      "username": "macaco",
      "password": "macaquinhoronald"
    },
    "analytics": {
      "visits": 0,
      "uniqueVisitors": 0,
      "totalClicks": 0,
      "cnpjLogins": 0,
      "pixGenerated": 0,
      "paymentsConfirmed": 0,
      "activePage": "primary",
      "primaryDomain": "albuquerqueconsultoriameidas.com",
      "pixKey": "6769b9cc-dae0-46f1-88db-3144cc4a7ca7",
      "pixMerchantName": "SERVICO EMPRESARIAL ASSEGURADO ILTDA",
      "pixMerchantCity": "SAO PAULO",
      "secondaryTitle": "Pagina ADV ativa",
      "secondaryMessage": "A pagina alternativa ADV esta ativa para exibir o conteudo institucional aos visitantes.",
      "lastVisitAt": "",
      "lastPaymentAt": "",
      "accessLog": [],
      "payments": []
    }
  }'::jsonb
)
on conflict (id) do nothing;
