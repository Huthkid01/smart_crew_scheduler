-- Invited users only have employee_id / org_id / role in raw_user_meta_data (no full_name).
-- A NULL full_name or missing org_id can break profile creation depending on DB rules.
-- This keeps admin self-signup behavior (full_name in metadata, org set by app after) and supports invites.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  meta jsonb := COALESCE(new.raw_user_meta_data, '{}'::jsonb);
  v_org_id uuid;
  v_org_text text;
  v_full_name text;
BEGIN
  v_full_name := NULLIF(
    trim(COALESCE(meta->>'full_name', meta->>'name', '')),
    ''
  );
  IF v_full_name IS NULL THEN
    v_full_name := split_part(new.email, '@', 1);
  END IF;

  v_org_text := NULLIF(trim(COALESCE(meta->>'org_id', '')), '');
  IF v_org_text IS NOT NULL THEN
    BEGIN
      v_org_id := v_org_text::uuid;
    EXCEPTION
      WHEN invalid_text_representation THEN
        v_org_id := NULL;
    END;
  ELSE
    v_org_id := NULL;
  END IF;

  -- Always 'employee' here; admins get role/org from the app after signup (same as before).
  INSERT INTO public.profiles (id, email, full_name, role, org_id)
  VALUES (new.id, new.email, v_full_name, 'employee', v_org_id);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
