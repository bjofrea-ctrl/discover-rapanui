-- Discover Rapa Nui — Presupuesto por evento, servicios incluidos y contabilidad
-- Aplicar DESPUÉS de 0001_init.sql (usa public.is_admin(), auth.users, public.events).
-- Aplicar en: Supabase Dashboard > SQL Editor > pegar y ejecutar completo.
-- Idempotente: puede re-ejecutarse sin duplicar objetos.

-- ============================================================
-- E.1 — Presupuesto por evento
-- ============================================================
alter table public.events
  add column if not exists budget_amount numeric,
  add column if not exists budget_currency text not null default 'CLP';

-- ============================================================
-- E.2 — Actividades / servicios incluidos por evento
-- ============================================================
create table if not exists public.event_services (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  service_type text not null check (service_type in (
    'ceremonia_ancestral','ceremonia_civil','arriendo_casa','restaurant',
    'cena','coctel','tour','fotografia','musica','flores','transporte','otro'
  )),
  description text,
  vendor_contact_id uuid references public.vendor_contacts(id) on delete set null,
  quantity int not null default 1,
  cost numeric,
  currency text not null default 'CLP',
  scheduled_date date,
  status text not null default 'planificado'
    check (status in ('planificado','confirmado','completado','cancelado'))
);

create index if not exists event_services_event_id_idx on public.event_services(event_id);

alter table public.event_services enable row level security;

-- Mismo patrón RLS que event_milestones/checklist_items: admin ve todo,
-- el cliente ve solo los servicios de su propio evento.
drop policy if exists event_services_select on public.event_services;
create policy event_services_select on public.event_services
  for select using (
    public.is_admin()
    or event_id in (
      select e.id from public.events e join public.clients c on c.id = e.client_id
      where c.auth_user_id = auth.uid()
    )
  );

drop policy if exists event_services_admin_write on public.event_services;
create policy event_services_admin_write on public.event_services
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- E.3 — Contabilidad de la empresa (admin-only, ningún cliente ve esto)
-- ============================================================
create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_date date not null,
  type text not null check (type in ('ingreso','egreso')),
  category text not null,
  description text,
  amount numeric not null check (amount >= 0),
  currency text not null default 'CLP',
  event_id uuid references public.events(id) on delete set null,
  source text not null default 'manual' check (source in ('manual','excel_import')),
  import_batch_id uuid,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists finance_transactions_date_idx on public.finance_transactions(transaction_date);
create index if not exists finance_transactions_batch_idx on public.finance_transactions(import_batch_id);

create table if not exists public.finance_imports (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  storage_path text not null,
  uploaded_by uuid references auth.users(id),
  uploaded_at timestamptz not null default now(),
  row_count int,
  status text not null default 'procesado' check (status in ('procesado','error')),
  notes text
);

alter table public.finance_transactions enable row level security;
alter table public.finance_imports enable row level security;

drop policy if exists finance_transactions_admin_only on public.finance_transactions;
create policy finance_transactions_admin_only on public.finance_transactions
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists finance_imports_admin_only on public.finance_imports;
create policy finance_imports_admin_only on public.finance_imports
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- STORAGE: bucket privado para los archivos Excel importados
-- ============================================================
insert into storage.buckets (id, name, public)
values ('finance-imports', 'finance-imports', false)
on conflict (id) do nothing;

drop policy if exists finance_imports_storage_admin_only on storage.objects;
create policy finance_imports_storage_admin_only on storage.objects
  for all using (bucket_id = 'finance-imports' and public.is_admin())
  with check (bucket_id = 'finance-imports' and public.is_admin());
