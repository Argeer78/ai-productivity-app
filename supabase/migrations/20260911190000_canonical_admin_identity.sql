BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.admin_users AS admin_user
    LEFT JOIN auth.users AS auth_user
      ON lower(auth_user.email) = lower(admin_user.email)
    GROUP BY admin_user.email
    HAVING count(auth_user.id) <> 1
  ) THEN
    RAISE EXCEPTION 'Cannot migrate admin_users: each admin email must match exactly one auth user';
  END IF;
END;
$$;

ALTER TABLE public.admin_users
  ADD COLUMN user_id uuid;

UPDATE public.admin_users AS admin_user
SET user_id = auth_user.id
FROM auth.users AS auth_user
WHERE lower(auth_user.email) = lower(admin_user.email);

ALTER TABLE public.admin_users
  ALTER COLUMN user_id SET NOT NULL;

DROP POLICY "admin_users read own row" ON public.admin_users;
DROP POLICY "admin can read feedback" ON public.feedback;
DROP POLICY "admins can read feedback" ON public.feedback;
DROP POLICY "Changelog admin insert" ON public.changelog_entries;

ALTER TABLE public.admin_users
  DROP CONSTRAINT admin_users_pkey,
  ADD CONSTRAINT admin_users_pkey PRIMARY KEY (user_id),
  ADD CONSTRAINT admin_users_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  DROP COLUMN email;

ALTER TABLE public.profiles
  DROP COLUMN is_admin;

CREATE POLICY "admin_users read own row"
ON public.admin_users
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "admins can read feedback"
ON public.feedback
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_users AS admin_user
    WHERE admin_user.user_id = auth.uid()
  )
);

CREATE POLICY "Changelog admin insert"
ON public.changelog_entries
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.admin_users AS admin_user
    WHERE admin_user.user_id = auth.uid()
  )
);

COMMIT;