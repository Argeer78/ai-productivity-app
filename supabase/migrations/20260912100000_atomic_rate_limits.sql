CREATE TABLE public.security_rate_limits (
  action_key text NOT NULL CHECK (action_key ~ '^[a-z0-9:_-]{1,128}$'),
  identity_hash text NOT NULL CHECK (identity_hash ~ '^(user|network|internal):[a-f0-9]{64}$'),
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count > 0),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (action_key, identity_hash, window_start)
);

CREATE INDEX security_rate_limits_expires_at_idx
  ON public.security_rate_limits (expires_at);

ALTER TABLE public.security_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.security_rate_limits FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.consume_rate_limit(
  p_action text,
  p_identity_hash text,
  p_limit integer,
  p_window_seconds integer,
  p_cost integer DEFAULT 1
)
RETURNS TABLE (allowed boolean, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  now_at timestamptz := clock_timestamp();
  bucket_start timestamptz;
  bucket_count integer;
BEGIN
  IF p_action !~ '^[a-z0-9:_-]{1,128}$'
    OR p_identity_hash !~ '^(user|network|internal):[a-f0-9]{64}$'
     OR p_limit < 1 OR p_limit > 10000
     OR p_window_seconds < 1 OR p_window_seconds > 86400
     OR p_cost < 1 OR p_cost > p_limit THEN
    RAISE EXCEPTION 'invalid rate limit parameters' USING ERRCODE = '22023';
  END IF;

  bucket_start := to_timestamp(
    floor(extract(epoch FROM now_at) / p_window_seconds) * p_window_seconds
  );

  DELETE FROM public.security_rate_limits
  WHERE expires_at < now_at - interval '1 day';

  INSERT INTO public.security_rate_limits (
    action_key, identity_hash, window_start, request_count, expires_at
  ) VALUES (
    p_action, p_identity_hash, bucket_start, p_cost,
    bucket_start + make_interval(secs => p_window_seconds)
  )
  ON CONFLICT (action_key, identity_hash, window_start) DO UPDATE
  SET request_count = public.security_rate_limits.request_count + EXCLUDED.request_count
  WHERE public.security_rate_limits.request_count + EXCLUDED.request_count <= p_limit
  RETURNING request_count INTO bucket_count;

  allowed := FOUND;
  retry_after_seconds := greatest(
    1,
    ceil(extract(epoch FROM bucket_start + make_interval(secs => p_window_seconds) - now_at))::integer
  );
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(text, text, integer, integer, integer)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, text, integer, integer, integer)
  TO service_role;