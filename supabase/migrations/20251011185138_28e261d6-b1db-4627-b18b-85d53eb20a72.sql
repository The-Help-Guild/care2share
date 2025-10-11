-- Create a safe bootstrap function to promote the first admin only if none exists
CREATE OR REPLACE FUNCTION public.bootstrap_admin(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_exists boolean;
BEGIN
  -- Check if any admin already exists
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'admin'
  ) INTO admin_exists;

  IF NOT admin_exists THEN
    -- Grant admin to the specified user and log creator
    INSERT INTO public.user_roles (user_id, role, created_by)
    VALUES (_user_id, 'admin', _user_id)
    ON CONFLICT DO NOTHING;
    RETURN true;
  ELSE
    RETURN false; -- An admin already exists; no changes made
  END IF;
END;
$$;