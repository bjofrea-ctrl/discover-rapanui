-- Ensure the admin user has a profile with role='admin'
-- (the trigger on_auth_user_created creates it with role='client' by default)
INSERT INTO public.profiles (id, role, full_name)
SELECT id, 'admin', 'Admin'
FROM auth.users
WHERE email = 'contacto@discoverrapanui.cl'
ON CONFLICT (id) DO UPDATE SET role = 'admin';
