-- Discover Rapa Nui — schema inicial (backend "nivel dios")
-- Aplicar en: Supabase Dashboard > SQL Editor > pegar y ejecutar completo.
-- Idempotente: puede re-ejecutarse sin duplicar objetos.

-- ============================================================
-- EXTENSIONES
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- PROFILES (extiende auth.users con rol)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'client' check (role in ('admin', 'client')),
  full_name text,
  created_at timestamptz not null default now()
);

-- Crea automáticamente un profile (role='client' por defecto) cuando se crea un auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- LEADS (pipeline de pre-venta, desde el formulario de contacto)
-- ============================================================
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text,
  country text,
  event_type text,
  guest_count int,
  message text,
  status text not null default 'nuevo'
    check (status in ('nuevo','contactado','cotizado','ganado','perdido')),
  converted_client_id uuid,
  source text default 'web'
);

-- ============================================================
-- CLIENTS (la pareja / cuenta)
-- ============================================================
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  email text not null unique,
  partner1_name text,
  partner2_name text,
  phone text,
  country text,
  internal_notes text,
  created_at timestamptz not null default now()
);

alter table public.leads
  add constraint leads_converted_client_id_fkey
  foreign key (converted_client_id) references public.clients(id) on delete set null;

-- ============================================================
-- EVENTS (la boda/experiencia en sí)
-- ============================================================
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  event_type text not null default 'boda_completa'
    check (event_type in ('elopement','boda_completa','renovacion_votos','tour','otro')),
  ceremony_type text check (ceremony_type in ('civil','ancestral','ambas', null)),
  event_date date,
  guest_count int,
  status text not null default 'cotizado'
    check (status in ('cotizado','contratado','planificacion','completado','cancelado')),
  coordinator_name text,
  created_at timestamptz not null default now()
);

create index if not exists events_client_id_idx on public.events(client_id);

-- ============================================================
-- EVENT_MILESTONES (cronograma real, reemplaza los 6 hitos hardcodeados de portal.html)
-- ============================================================
create table if not exists public.event_milestones (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  phase_label text not null,
  title text not null,
  description text,
  order_index int not null default 0,
  status text not null default 'pendiente'
    check (status in ('pendiente','en_progreso','completado')),
  due_date date,
  completed_at timestamptz
);

create index if not exists event_milestones_event_id_idx on public.event_milestones(event_id);

-- ============================================================
-- CHECKLIST_ITEMS (documentos + checklist de viaje, con progreso persistente)
-- ============================================================
create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  category text not null
    check (category in ('documentos_civil','documentos_ancestral','viaje','otro')),
  label text not null,
  is_checked boolean not null default false,
  checked_at timestamptz,
  checked_by uuid references auth.users(id),
  order_index int not null default 0
);

create index if not exists checklist_items_event_id_idx on public.checklist_items(event_id);

-- ============================================================
-- VENDOR_CONTACTS (proveedores asignados por evento + contactos globales)
-- ============================================================
create table if not exists public.vendor_contacts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  category text not null
    check (category in ('coordinador','fotografia','banqueteria','musica','flores','emergencia','otro')),
  name text not null,
  phone text,
  email text,
  notes text,
  is_global boolean not null default false
);

create index if not exists vendor_contacts_event_id_idx on public.vendor_contacts(event_id);

-- ============================================================
-- DOCUMENTS (metadata de archivos en Supabase Storage)
-- ============================================================
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  storage_path text not null,
  filename text not null,
  mime_type text,
  size_bytes int,
  category text default 'otro'
    check (category in ('contrato','identificacion','itinerario','otro')),
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists documents_event_id_idx on public.documents(event_id);

-- ============================================================
-- MESSAGES (mensajería coordinador <-> cliente, por evento)
-- ============================================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  sender_id uuid references auth.users(id),
  sender_role text not null check (sender_role in ('cliente','coordinador')),
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists messages_event_id_idx on public.messages(event_id);

-- ============================================================
-- TEMPLATES (Fase 2 — catálogo reusable de cronograma/checklist)
-- ============================================================
create table if not exists public.milestone_templates (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  phase_label text not null,
  title text not null,
  description text,
  order_index int not null default 0
);

create table if not exists public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  ceremony_type text,
  category text not null,
  label text not null,
  order_index int not null default 0
);

-- RPC: clona las plantillas activas hacia un evento nuevo
create or replace function public.clone_templates_to_event(p_event_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_event record;
begin
  select event_type, ceremony_type into v_event from public.events where id = p_event_id;
  if not found then
    raise exception 'event % not found', p_event_id;
  end if;

  insert into public.event_milestones (event_id, phase_label, title, description, order_index)
  select p_event_id, phase_label, title, description, order_index
  from public.milestone_templates
  where event_type = v_event.event_type;

  insert into public.checklist_items (event_id, category, label, order_index)
  select p_event_id, category, label, order_index
  from public.checklist_templates
  where event_type = v_event.event_type
    and (ceremony_type is null or ceremony_type = v_event.ceremony_type);
end;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.clients enable row level security;
alter table public.events enable row level security;
alter table public.event_milestones enable row level security;
alter table public.checklist_items enable row level security;
alter table public.vendor_contacts enable row level security;
alter table public.documents enable row level security;
alter table public.messages enable row level security;
alter table public.milestone_templates enable row level security;
alter table public.checklist_templates enable row level security;

-- Helper: ¿el usuario actual es admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- profiles: cada usuario ve/edita su propio profile; admin ve todos
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- leads: SOLO admin (el INSERT público pasa por la Edge Function con service-role key,
-- nunca por una policy anon en esta tabla)
drop policy if exists leads_admin_all on public.leads;
create policy leads_admin_all on public.leads
  for all using (public.is_admin()) with check (public.is_admin());

-- clients: admin ve todo; el propio cliente ve/edita su fila
drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients
  for select using (public.is_admin() or auth_user_id = auth.uid());

drop policy if exists clients_admin_write on public.clients;
create policy clients_admin_write on public.clients
  for insert with check (public.is_admin());

drop policy if exists clients_admin_update on public.clients;
create policy clients_admin_update on public.clients
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists clients_admin_delete on public.clients;
create policy clients_admin_delete on public.clients
  for delete using (public.is_admin());

-- events: admin ve todo; cliente ve solo sus propios eventos
drop policy if exists events_select on public.events;
create policy events_select on public.events
  for select using (
    public.is_admin()
    or client_id in (select id from public.clients where auth_user_id = auth.uid())
  );

drop policy if exists events_admin_write on public.events;
create policy events_admin_write on public.events
  for insert with check (public.is_admin());

drop policy if exists events_admin_update on public.events;
create policy events_admin_update on public.events
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists events_admin_delete on public.events;
create policy events_admin_delete on public.events
  for delete using (public.is_admin());

-- Patrón estándar reutilizado para tablas dependientes de event_id:
-- visible si admin, o si el evento pertenece al cliente autenticado.
-- (checklist_items tiene además el RPC toggle_checklist_item para que
-- el cliente pueda marcar progreso sin UPDATE directo por RLS)

drop policy if exists event_milestones_select on public.event_milestones;
create policy event_milestones_select on public.event_milestones
  for select using (
    public.is_admin()
    or event_id in (
      select e.id from public.events e join public.clients c on c.id = e.client_id
      where c.auth_user_id = auth.uid()
    )
  );

drop policy if exists event_milestones_admin_write on public.event_milestones;
create policy event_milestones_admin_write on public.event_milestones
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists checklist_items_select on public.checklist_items;
create policy checklist_items_select on public.checklist_items
  for select using (
    public.is_admin()
    or event_id in (
      select e.id from public.events e join public.clients c on c.id = e.client_id
      where c.auth_user_id = auth.uid()
    )
  );

drop policy if exists checklist_items_admin_write on public.checklist_items;
create policy checklist_items_admin_write on public.checklist_items
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists vendor_contacts_select on public.vendor_contacts;
create policy vendor_contacts_select on public.vendor_contacts
  for select using (
    public.is_admin()
    or is_global = true
    or event_id in (
      select e.id from public.events e join public.clients c on c.id = e.client_id
      where c.auth_user_id = auth.uid()
    )
  );

drop policy if exists vendor_contacts_admin_write on public.vendor_contacts;
create policy vendor_contacts_admin_write on public.vendor_contacts
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents
  for select using (
    public.is_admin()
    or event_id in (
      select e.id from public.events e join public.clients c on c.id = e.client_id
      where c.auth_user_id = auth.uid()
    )
  );

drop policy if exists documents_admin_write on public.documents;
create policy documents_admin_write on public.documents
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select using (
    public.is_admin()
    or event_id in (
      select e.id from public.events e join public.clients c on c.id = e.client_id
      where c.auth_user_id = auth.uid()
    )
  );

-- messages: tanto admin como el cliente dueño del evento pueden insertar (es un chat)
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert with check (
    public.is_admin()
    or event_id in (
      select e.id from public.events e join public.clients c on c.id = e.client_id
      where c.auth_user_id = auth.uid()
    )
  );

drop policy if exists messages_admin_update on public.messages;
create policy messages_admin_update on public.messages
  for update using (public.is_admin()) with check (public.is_admin());

-- templates: solo admin (son catálogo interno)
drop policy if exists milestone_templates_admin on public.milestone_templates;
create policy milestone_templates_admin on public.milestone_templates
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists checklist_templates_admin on public.checklist_templates;
create policy checklist_templates_admin on public.checklist_templates
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- RPC: toggle_checklist_item
-- Permite que el cliente marque/desmarque SOLO is_checked/checked_at/checked_by
-- de un ítem de SU propio evento, sin exponer UPDATE amplio por RLS.
-- ============================================================
create or replace function public.toggle_checklist_item(p_item_id uuid, p_checked boolean)
returns public.checklist_items
language plpgsql
security definer set search_path = public
as $$
declare
  v_row public.checklist_items;
  v_allowed boolean;
begin
  select exists (
    select 1
    from public.checklist_items ci
    join public.events e on e.id = ci.event_id
    join public.clients c on c.id = e.client_id
    where ci.id = p_item_id
      and (public.is_admin() or c.auth_user_id = auth.uid())
  ) into v_allowed;

  if not v_allowed then
    raise exception 'not authorized to modify this checklist item';
  end if;

  update public.checklist_items
  set is_checked = p_checked,
      checked_at = case when p_checked then now() else null end,
      checked_by = case when p_checked then auth.uid() else null end
  where id = p_item_id
  returning * into v_row;

  return v_row;
end;
$$;

-- ============================================================
-- STORAGE: bucket privado para documentos de eventos
-- ============================================================
insert into storage.buckets (id, name, public)
values ('event-documents', 'event-documents', false)
on conflict (id) do nothing;

-- Politica de Storage: el path debe empezar con "{event_id}/" y el evento debe
-- pertenecer al usuario (o ser admin). Se asume upload con path "<event_id>/<filename>".
drop policy if exists event_documents_select on storage.objects;
create policy event_documents_select on storage.objects
  for select using (
    bucket_id = 'event-documents'
    and (
      public.is_admin()
      or (storage.foldername(name))[1]::uuid in (
        select e.id from public.events e join public.clients c on c.id = e.client_id
        where c.auth_user_id = auth.uid()
      )
    )
  );

drop policy if exists event_documents_admin_write on storage.objects;
create policy event_documents_admin_write on storage.objects
  for all using (bucket_id = 'event-documents' and public.is_admin())
  with check (bucket_id = 'event-documents' and public.is_admin());
