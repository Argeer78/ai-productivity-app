BEGIN;

CREATE TABLE public.play_integrity_verifications (
    token_hash text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    verified_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT play_integrity_verifications_token_hash_check CHECK (length(token_hash) = 64)
);

ALTER TABLE public.play_integrity_verifications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.play_integrity_verifications FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON TABLE public.play_integrity_verifications TO service_role;

CREATE INDEX play_integrity_verifications_user_id_idx
    ON public.play_integrity_verifications (user_id);

COMMIT;