-- Set admin role for the new email
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'contacto@discoverrapanui.cl'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- Remove role from old admin email
DELETE FROM public.user_roles
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'admin@discover-rapanui.com'
);
