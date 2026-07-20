-- Fix: el admin creado en 0003_user_roles.sql quedó marcado 'admin' solo en la
-- tabla nueva `user_roles`, que ninguna policy RLS del esquema real usa. Todas
-- las policies admin-only (leads, clients, events, finance_transactions,
-- documents, etc.) dependen de public.is_admin() -> public.profiles.role.
-- Como el trigger on_auth_user_created crea el profile con role='client' por
-- defecto, el admin quedaba sin acceso a ninguna de esas tablas pese a poder
-- autenticarse. Este fix alinea profiles.role con el usuario admin real.
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'admin@discover-rapanui.com');
