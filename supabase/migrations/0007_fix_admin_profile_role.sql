-- Fix: 0003_user_roles.sql y 0006_admin_email.sql solo escriben en la tabla
-- `user_roles`, que ninguna policy RLS del esquema real usa. Todas las
-- policies admin-only (leads, clients, events, finance_transactions,
-- documents, etc.) dependen de public.is_admin() -> public.profiles.role.
-- Como el trigger on_auth_user_created crea el profile con role='client' por
-- defecto, el admin real (contacto@discoverrapanui.cl) queda sin acceso a
-- ninguna de esas tablas pese a poder autenticarse. Este fix alinea
-- profiles.role con el usuario admin real y limpia el rol del email anterior.
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'contacto@discoverrapanui.cl');

update public.profiles
set role = 'client'
where id = (select id from auth.users where email = 'admin@discover-rapanui.com');
