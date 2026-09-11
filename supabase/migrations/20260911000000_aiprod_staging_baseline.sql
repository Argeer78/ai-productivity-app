--
-- PostgreSQL database dump
--

-- AIProd application-owned baseline captured from staging on 2026-09-11.
-- Apply only after the pinned Supabase platform has completed its bootstrap.
-- This migration intentionally preserves staging behavior, including known gaps.

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: get_ai_usage_today(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_ai_usage_today(p_user_id uuid) RETURNS integer
    LANGUAGE sql STABLE
    AS $$
  select coalesce(
    (select count from public.ai_usage where user_id = p_user_id and usage_date = current_date),
    0
  );
$$;


--
-- Name: increment_ai_usage(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_ai_usage(p_user_id uuid, p_inc integer DEFAULT 1) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  insert into public.ai_usage (user_id, usage_date, count)
  values (p_user_id, current_date, p_inc)
  on conflict (user_id, usage_date)
  do update set
    count = public.ai_usage.count + excluded.count;
end;
$$;


--
-- Name: reset_reminder_sent_on_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reset_reminder_sent_on_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if (NEW.reminder_enabled = true
      and NEW.reminder_at is not null
      and (
        NEW.reminder_at is distinct from OLD.reminder_at
        or NEW.reminder_enabled is distinct from OLD.reminder_enabled
      )
  ) then
    NEW.reminder_sent_at := null;
  end if;

  return NEW;
end;
$$;


--
-- Name: set_current_timestamp_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_current_timestamp_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: ui_translations_sync_lang(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ui_translations_sync_lang() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.lang := new.language_code;
  return new;
end;
$$;


--
-- Name: weekday_int_array_is_valid(integer[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.weekday_int_array_is_valid(a integer[]) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $$
  select
    a is null
    or (
      array_length(a, 1) >= 1
      and array_position(a, null) is null
      and (select min(x) from unnest(a) as x) >= 0
      and (select max(x) from unnest(a) as x) <= 6
    );
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_users (
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ai_chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    thread_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_chat_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])))
);


--
-- Name: ai_chat_threads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_chat_threads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    category text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_companion_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_companion_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    thread_id uuid,
    user_id uuid,
    role text,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ai_companion_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text])))
);


--
-- Name: ai_companion_threads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_companion_threads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid DEFAULT auth.uid(),
    title text NOT NULL,
    category text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    summary text
);


--
-- Name: ai_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid DEFAULT gen_random_uuid() NOT NULL,
    usage_date date,
    count integer
);


--
-- Name: app_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    rating smallint NOT NULL,
    comment text,
    source text DEFAULT 'page'::text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT app_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: changelog_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.changelog_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    section text DEFAULT 'Latest'::text,
    body text NOT NULL,
    published_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: daily_checkins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_checkins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    checkin_date date NOT NULL,
    mood text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT daily_checkins_mood_check CHECK ((mood = ANY (ARRAY['good'::text, 'okay'::text, 'overwhelming'::text])))
);


--
-- Name: daily_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_scores (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    score_date date NOT NULL,
    score integer NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now(),
    energy_level smallint,
    CONSTRAINT daily_scores_score_check CHECK (((score >= 0) AND (score <= 100)))
);


--
-- Name: email_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_logs (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    type text NOT NULL,
    to_email text NOT NULL,
    subject text NOT NULL,
    status text NOT NULL,
    error_message text,
    meta jsonb
);


--
-- Name: email_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_logs_id_seq OWNED BY public.email_logs.id;


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id bigint NOT NULL,
    user_id uuid,
    name text NOT NULL,
    props jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.events_id_seq OWNED BY public.events.id;


--
-- Name: feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    email text,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    source text
);


--
-- Name: languages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.languages (
    code text NOT NULL,
    label text NOT NULL,
    flag text,
    region text,
    popular boolean DEFAULT false NOT NULL,
    rtl boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    content text DEFAULT 'allowed'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    ai_result text DEFAULT 'text'::text NOT NULL,
    user_id uuid DEFAULT gen_random_uuid() NOT NULL,
    category text DEFAULT 'general'::text
);


--
-- Name: page_translations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.page_translations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    language_code text NOT NULL,
    original_text text NOT NULL,
    translated_text text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    plan text DEFAULT 'free'::text NOT NULL,
    stripe_customer_id text,
    created_at timestamp with time zone DEFAULT now(),
    ai_tone text,
    focus_area text,
    daily_digest_enabled boolean DEFAULT false,
    daily_digest_hour integer DEFAULT 8,
    wants_daily_digest boolean DEFAULT false NOT NULL,
    weekly_report_enabled boolean DEFAULT true NOT NULL,
    latest_seen_changelog_at timestamp with time zone,
    is_admin boolean DEFAULT false,
    onboarding_use_case text,
    onboarding_weekly_focus text,
    onboarding_reminder text DEFAULT 'none'::text,
    ui_theme text,
    ui_language text DEFAULT 'en'::text,
    language text DEFAULT 'en'::text,
    onboarding_completed boolean DEFAULT false,
    CONSTRAINT profiles_onboarding_reminder_check CHECK ((onboarding_reminder = ANY (ARRAY['none'::text, 'daily'::text, 'weekly'::text])))
);


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    subscription jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    completed boolean DEFAULT false NOT NULL,
    due_date date,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    category text DEFAULT 'general'::text,
    time_from text,
    time_to text,
    reminder_enabled boolean DEFAULT false,
    reminder_at timestamp with time zone,
    reminder_sent_at timestamp with time zone,
    source_note_id uuid,
    priority text DEFAULT 'medium'::text,
    reminder_repeat text DEFAULT 'none'::text NOT NULL,
    reminder_time text,
    reminder_weekdays integer[],
    reminder_month_day integer,
    CONSTRAINT tasks_reminder_month_day_check CHECK (((reminder_month_day IS NULL) OR ((reminder_month_day >= 1) AND (reminder_month_day <= 31)))),
    CONSTRAINT tasks_reminder_repeat_check CHECK ((reminder_repeat = ANY (ARRAY['none'::text, 'daily'::text, 'weekly'::text, 'monthly'::text]))),
    CONSTRAINT tasks_reminder_weekdays_check CHECK (public.weekday_int_array_is_valid(reminder_weekdays))
);


--
-- Name: template_favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.template_favorites (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    template_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.templates (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    name text NOT NULL,
    description text,
    prompt text NOT NULL,
    category text,
    is_pro_only boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    title text,
    ai_prompt text,
    is_public boolean DEFAULT false,
    usage_count integer DEFAULT 0
);


--
-- Name: translations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.translations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    namespace text NOT NULL,
    language_code text NOT NULL,
    key text NOT NULL,
    text text NOT NULL,
    inserted_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: travel_clicks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.travel_clicks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    click_type text NOT NULL,
    provider text NOT NULL,
    destination text,
    from_city text,
    checkin date,
    checkout date,
    adults integer,
    children integer,
    meta jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: travel_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.travel_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    destination text,
    checkin_date date,
    checkout_date date,
    adults integer,
    children integer,
    min_budget numeric,
    max_budget numeric,
    plan_text text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ui_translations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ui_translations (
    id bigint NOT NULL,
    key text NOT NULL,
    language_code text NOT NULL,
    text text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    lang text,
    CONSTRAINT ui_translations_language_code_trim_check CHECK ((language_code = lower(btrim(language_code))))
);


--
-- Name: ui_translations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ui_translations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ui_translations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ui_translations_id_seq OWNED BY public.ui_translations.id;


--
-- Name: user_notification_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_notification_settings (
    user_id uuid NOT NULL,
    daily_success_enabled boolean DEFAULT true NOT NULL,
    daily_success_time time without time zone DEFAULT '09:00:00'::time without time zone NOT NULL,
    evening_reflection_enabled boolean DEFAULT true NOT NULL,
    evening_reflection_time time without time zone DEFAULT '21:30:00'::time without time zone NOT NULL,
    task_reminders_enabled boolean DEFAULT true NOT NULL,
    weekly_report_enabled boolean DEFAULT true NOT NULL,
    timezone text DEFAULT 'Europe/Athens'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: weekly_action_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weekly_action_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    week_start date NOT NULL,
    plan_text text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: weekly_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weekly_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    week_start date NOT NULL,
    goal_text text NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: weekly_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weekly_reports (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    report_date date DEFAULT CURRENT_DATE NOT NULL,
    summary text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: email_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs ALTER COLUMN id SET DEFAULT nextval('public.email_logs_id_seq'::regclass);


--
-- Name: events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);


--
-- Name: ui_translations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ui_translations ALTER COLUMN id SET DEFAULT nextval('public.ui_translations_id_seq'::regclass);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (email);


--
-- Name: ai_chat_messages ai_chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_chat_messages
    ADD CONSTRAINT ai_chat_messages_pkey PRIMARY KEY (id);


--
-- Name: ai_chat_threads ai_chat_threads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_chat_threads
    ADD CONSTRAINT ai_chat_threads_pkey PRIMARY KEY (id);


--
-- Name: ai_companion_messages ai_companion_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_companion_messages
    ADD CONSTRAINT ai_companion_messages_pkey PRIMARY KEY (id);


--
-- Name: ai_companion_threads ai_companion_threads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_companion_threads
    ADD CONSTRAINT ai_companion_threads_pkey PRIMARY KEY (id);


--
-- Name: ai_usage ai_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage
    ADD CONSTRAINT ai_usage_pkey PRIMARY KEY (id);


--
-- Name: app_reviews app_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_reviews
    ADD CONSTRAINT app_reviews_pkey PRIMARY KEY (id);


--
-- Name: changelog_entries changelog_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.changelog_entries
    ADD CONSTRAINT changelog_entries_pkey PRIMARY KEY (id);


--
-- Name: daily_checkins daily_checkins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_checkins
    ADD CONSTRAINT daily_checkins_pkey PRIMARY KEY (id);


--
-- Name: daily_scores daily_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_scores
    ADD CONSTRAINT daily_scores_pkey PRIMARY KEY (id);


--
-- Name: daily_scores daily_scores_user_id_score_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_scores
    ADD CONSTRAINT daily_scores_user_id_score_date_key UNIQUE (user_id, score_date);


--
-- Name: email_logs email_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: feedback feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);


--
-- Name: languages languages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.languages
    ADD CONSTRAINT languages_pkey PRIMARY KEY (code);


--
-- Name: notes notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id, ai_result, user_id);


--
-- Name: page_translations page_translations_lang_original_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_translations
    ADD CONSTRAINT page_translations_lang_original_key UNIQUE (language_code, original_text);


--
-- Name: page_translations page_translations_language_code_original_text_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_translations
    ADD CONSTRAINT page_translations_language_code_original_text_key UNIQUE (language_code, original_text);


--
-- Name: page_translations page_translations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_translations
    ADD CONSTRAINT page_translations_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_user_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_endpoint_key UNIQUE (user_id, endpoint);


--
-- Name: push_subscriptions push_subscriptions_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_key UNIQUE (user_id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: template_favorites template_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_favorites
    ADD CONSTRAINT template_favorites_pkey PRIMARY KEY (id);


--
-- Name: template_favorites template_favorites_user_id_template_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_favorites
    ADD CONSTRAINT template_favorites_user_id_template_id_key UNIQUE (user_id, template_id);


--
-- Name: templates templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (id);


--
-- Name: translations translations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.translations
    ADD CONSTRAINT translations_pkey PRIMARY KEY (id);


--
-- Name: travel_clicks travel_clicks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_clicks
    ADD CONSTRAINT travel_clicks_pkey PRIMARY KEY (id);


--
-- Name: travel_plans travel_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_plans
    ADD CONSTRAINT travel_plans_pkey PRIMARY KEY (id);


--
-- Name: ui_translations ui_translations_key_language_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ui_translations
    ADD CONSTRAINT ui_translations_key_language_unique UNIQUE (key, language_code);


--
-- Name: ui_translations ui_translations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ui_translations
    ADD CONSTRAINT ui_translations_pkey PRIMARY KEY (id);


--
-- Name: user_notification_settings user_notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_pkey PRIMARY KEY (user_id);


--
-- Name: weekly_action_plans weekly_action_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_action_plans
    ADD CONSTRAINT weekly_action_plans_pkey PRIMARY KEY (id);


--
-- Name: weekly_goals weekly_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_goals
    ADD CONSTRAINT weekly_goals_pkey PRIMARY KEY (id);


--
-- Name: weekly_reports weekly_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_reports
    ADD CONSTRAINT weekly_reports_pkey PRIMARY KEY (id);


--
-- Name: ai_companion_messages_thread_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_companion_messages_thread_id_idx ON public.ai_companion_messages USING btree (thread_id);


--
-- Name: ai_companion_threads_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_companion_threads_user_id_idx ON public.ai_companion_threads USING btree (user_id);


--
-- Name: ai_usage_user_day_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ai_usage_user_day_uidx ON public.ai_usage USING btree (user_id, usage_date);


--
-- Name: daily_checkins_user_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX daily_checkins_user_date_idx ON public.daily_checkins USING btree (user_id, checkin_date DESC);


--
-- Name: daily_checkins_user_date_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX daily_checkins_user_date_uq ON public.daily_checkins USING btree (user_id, checkin_date);


--
-- Name: daily_scores_user_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX daily_scores_user_date_idx ON public.daily_scores USING btree (user_id, score_date DESC);


--
-- Name: email_logs_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_logs_created_at_idx ON public.email_logs USING btree (created_at DESC);


--
-- Name: idx_ai_chat_messages_thread_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_chat_messages_thread_id ON public.ai_chat_messages USING btree (thread_id);


--
-- Name: idx_ai_chat_threads_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_chat_threads_user_id ON public.ai_chat_threads USING btree (user_id);


--
-- Name: idx_push_subscriptions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions USING btree (user_id);


--
-- Name: idx_tasks_user_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_user_category ON public.tasks USING btree (user_id, category);


--
-- Name: ui_translations_key_lang_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ui_translations_key_lang_idx ON public.ui_translations USING btree (key, language_code);


--
-- Name: ui_translations_key_lang_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ui_translations_key_lang_unique ON public.ui_translations USING btree (key, language_code);


--
-- Name: ui_translations_key_language_code_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ui_translations_key_language_code_uidx ON public.ui_translations USING btree (key, language_code);


--
-- Name: weekly_goals_user_week_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX weekly_goals_user_week_idx ON public.weekly_goals USING btree (user_id, week_start);


--
-- Name: tasks trg_reset_reminder_sent_on_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_reset_reminder_sent_on_change BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.reset_reminder_sent_on_change();


--
-- Name: ui_translations trg_ui_translations_sync_lang; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ui_translations_sync_lang BEFORE INSERT OR UPDATE OF language_code ON public.ui_translations FOR EACH ROW EXECUTE FUNCTION public.ui_translations_sync_lang();


--
-- Name: user_notification_settings user_notification_settings_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER user_notification_settings_set_updated_at BEFORE UPDATE ON public.user_notification_settings FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


--
-- Name: ai_chat_messages ai_chat_messages_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_chat_messages
    ADD CONSTRAINT ai_chat_messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.ai_chat_threads(id) ON DELETE CASCADE;


--
-- Name: ai_chat_messages ai_chat_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_chat_messages
    ADD CONSTRAINT ai_chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ai_chat_threads ai_chat_threads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_chat_threads
    ADD CONSTRAINT ai_chat_threads_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ai_companion_messages ai_companion_messages_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_companion_messages
    ADD CONSTRAINT ai_companion_messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.ai_companion_threads(id) ON DELETE CASCADE;


--
-- Name: ai_companion_messages ai_companion_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_companion_messages
    ADD CONSTRAINT ai_companion_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ai_companion_threads ai_companion_threads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_companion_threads
    ADD CONSTRAINT ai_companion_threads_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: app_reviews app_reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_reviews
    ADD CONSTRAINT app_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: daily_checkins daily_checkins_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_checkins
    ADD CONSTRAINT daily_checkins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: daily_scores daily_scores_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_scores
    ADD CONSTRAINT daily_scores_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: push_subscriptions push_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: template_favorites template_favorites_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_favorites
    ADD CONSTRAINT template_favorites_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE;


--
-- Name: template_favorites template_favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_favorites
    ADD CONSTRAINT template_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: templates templates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: travel_clicks travel_clicks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_clicks
    ADD CONSTRAINT travel_clicks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: travel_plans travel_plans_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_plans
    ADD CONSTRAINT travel_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_notification_settings user_notification_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: weekly_action_plans weekly_action_plans_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_action_plans
    ADD CONSTRAINT weekly_action_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: weekly_goals weekly_goals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_goals
    ADD CONSTRAINT weekly_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: weekly_reports weekly_reports_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_reports
    ADD CONSTRAINT weekly_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: feedback Admins can read all feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read all feedback" ON public.feedback FOR SELECT USING ((auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid));


--
-- Name: templates Allow delete own templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow delete own templates" ON public.templates FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: templates Allow insert own templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert own templates" ON public.templates FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: travel_clicks Allow inserts from anon for logging; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow inserts from anon for logging" ON public.travel_clicks FOR INSERT TO anon WITH CHECK (true);


--
-- Name: templates Allow select on templates for authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow select on templates for authenticated" ON public.templates FOR SELECT TO authenticated USING (((user_id IS NULL) OR (auth.uid() = user_id)));


--
-- Name: templates Allow update own templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow update own templates" ON public.templates FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: feedback Anyone can insert feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert feedback" ON public.feedback FOR INSERT WITH CHECK (true);


--
-- Name: app_reviews Anyone can insert reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert reviews" ON public.app_reviews FOR INSERT WITH CHECK (true);


--
-- Name: changelog_entries Changelog admin insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Changelog admin insert" ON public.changelog_entries FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.is_admin = true)))));


--
-- Name: changelog_entries Changelog public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Changelog public read" ON public.changelog_entries FOR SELECT USING (true);


--
-- Name: ui_translations Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.ui_translations FOR SELECT USING (true);


--
-- Name: templates Public or own templates selectable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public or own templates selectable" ON public.templates FOR SELECT USING (((is_public = true) OR (auth.uid() = user_id)));


--
-- Name: ai_usage Users can delete own ai_usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own ai_usage" ON public.ai_usage FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: notes Users can delete own notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own notes" ON public.notes FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: tasks Users can delete own tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own tasks" ON public.tasks FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: travel_plans Users can delete own travel_plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own travel_plans" ON public.travel_plans FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: weekly_goals Users can delete own weekly_goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own weekly_goals" ON public.weekly_goals FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: template_favorites Users can delete their favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their favorites" ON public.template_favorites FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: ai_usage Users can insert own ai_usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own ai_usage" ON public.ai_usage FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: daily_scores Users can insert own daily_scores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own daily_scores" ON public.daily_scores FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: notes Users can insert own notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own notes" ON public.notes FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((id = auth.uid()));


--
-- Name: tasks Users can insert own tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own tasks" ON public.tasks FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: travel_plans Users can insert own travel_plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own travel_plans" ON public.travel_plans FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: weekly_goals Users can insert own weekly_goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own weekly_goals" ON public.weekly_goals FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: weekly_reports Users can insert own weekly_reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own weekly_reports" ON public.weekly_reports FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: template_favorites Users can insert their favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their favorites" ON public.template_favorites FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_notification_settings Users can insert their own notification settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own notification settings" ON public.user_notification_settings FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: daily_scores Users can insert their own scores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own scores" ON public.daily_scores FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: ai_usage Users can read own ai_usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own ai_usage" ON public.ai_usage FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: daily_scores Users can read own daily_scores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own daily_scores" ON public.daily_scores FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: notes Users can read own notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own notes" ON public.notes FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: profiles Users can read own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING ((id = auth.uid()));


--
-- Name: app_reviews Users can read own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own reviews" ON public.app_reviews FOR SELECT USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: tasks Users can read own tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own tasks" ON public.tasks FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: travel_plans Users can read own travel_plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own travel_plans" ON public.travel_plans FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: weekly_goals Users can read own weekly_goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own weekly_goals" ON public.weekly_goals FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: weekly_reports Users can read own weekly_reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own weekly_reports" ON public.weekly_reports FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: daily_scores Users can select their own scores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can select their own scores" ON public.daily_scores FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ai_usage Users can update own ai_usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own ai_usage" ON public.ai_usage FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: daily_scores Users can update own daily_scores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own daily_scores" ON public.daily_scores FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: notes Users can update own notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own notes" ON public.notes FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));


--
-- Name: tasks Users can update own tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own tasks" ON public.tasks FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: travel_plans Users can update own travel_plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own travel_plans" ON public.travel_plans FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: weekly_goals Users can update own weekly_goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own weekly_goals" ON public.weekly_goals FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: weekly_reports Users can update own weekly_reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own weekly_reports" ON public.weekly_reports FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: user_notification_settings Users can update their own notification settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notification settings" ON public.user_notification_settings FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: daily_scores Users can update their own scores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own scores" ON public.daily_scores FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: template_favorites Users can view their favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their favorites" ON public.template_favorites FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_notification_settings Users can view their own notification settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notification settings" ON public.user_notification_settings FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: weekly_goals Users insert own weekly goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users insert own weekly goals" ON public.weekly_goals FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: weekly_goals Users read own weekly goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users read own weekly goals" ON public.weekly_goals FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: weekly_goals Users update own weekly goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users update own weekly goals" ON public.weekly_goals FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: feedback admin can read feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin can read feedback" ON public.feedback FOR SELECT USING ((auth.email() = current_setting('app.admin_email'::text, true)));


--
-- Name: admin_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_users admin_users read own row; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin_users read own row" ON public.admin_users FOR SELECT USING ((lower(email) = lower((auth.jwt() ->> 'email'::text))));


--
-- Name: feedback admins can read feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admins can read feedback" ON public.feedback FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE (lower(au.email) = lower((auth.jwt() ->> 'email'::text))))));


--
-- Name: ai_chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_chat_messages ai_chat_messages_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_chat_messages_delete_own ON public.ai_chat_messages FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: ai_chat_messages ai_chat_messages_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_chat_messages_insert_own ON public.ai_chat_messages FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: ai_chat_messages ai_chat_messages_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_chat_messages_select_own ON public.ai_chat_messages FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ai_chat_messages ai_chat_messages_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_chat_messages_update_own ON public.ai_chat_messages FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: ai_chat_threads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_chat_threads ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_chat_threads ai_chat_threads_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_chat_threads_delete_own ON public.ai_chat_threads FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: ai_chat_threads ai_chat_threads_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_chat_threads_insert_own ON public.ai_chat_threads FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: ai_chat_threads ai_chat_threads_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_chat_threads_select_own ON public.ai_chat_threads FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ai_chat_threads ai_chat_threads_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_chat_threads_update_own ON public.ai_chat_threads FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: ai_companion_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_companion_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_companion_threads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_companion_threads ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_usage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

--
-- Name: page_translations allow insert all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow insert all" ON public.page_translations FOR INSERT TO anon WITH CHECK (true);


--
-- Name: page_translations allow select all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow select all" ON public.page_translations FOR SELECT TO anon USING (true);


--
-- Name: page_translations allow update all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow update all" ON public.page_translations FOR UPDATE TO anon USING (true) WITH CHECK (true);


--
-- Name: app_reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: changelog_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.changelog_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_checkins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_checkins daily_checkins_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY daily_checkins_insert_own ON public.daily_checkins FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: daily_checkins daily_checkins_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY daily_checkins_select_own ON public.daily_checkins FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: daily_scores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_scores ENABLE ROW LEVEL SECURITY;

--
-- Name: email_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

--
-- Name: feedback; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

--
-- Name: feedback feedback_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY feedback_insert_own ON public.feedback FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: languages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_companion_messages messages_delete_own_threads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY messages_delete_own_threads ON public.ai_companion_messages FOR DELETE TO authenticated USING (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.ai_companion_threads t
  WHERE ((t.id = ai_companion_messages.thread_id) AND (t.user_id = auth.uid()))))));


--
-- Name: ai_companion_messages messages_insert_own_threads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY messages_insert_own_threads ON public.ai_companion_messages FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.ai_companion_threads t
  WHERE ((t.id = ai_companion_messages.thread_id) AND (t.user_id = auth.uid()))))));


--
-- Name: ai_companion_messages messages_select_own_threads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY messages_select_own_threads ON public.ai_companion_messages FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.ai_companion_threads t
  WHERE ((t.id = ai_companion_messages.thread_id) AND (t.user_id = auth.uid())))));


--
-- Name: ai_companion_messages messages_update_own_threads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY messages_update_own_threads ON public.ai_companion_messages FOR UPDATE TO authenticated USING (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.ai_companion_threads t
  WHERE ((t.id = ai_companion_messages.thread_id) AND (t.user_id = auth.uid())))))) WITH CHECK ((user_id = auth.uid()));


--
-- Name: notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

--
-- Name: page_translations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.page_translations ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: page_translations public read write translations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read write translations" ON public.page_translations USING (true) WITH CHECK (true);


--
-- Name: push_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: template_favorites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.template_favorites ENABLE ROW LEVEL SECURITY;

--
-- Name: templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_companion_threads threads_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY threads_delete_own ON public.ai_companion_threads FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: ai_companion_threads threads_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY threads_insert_own ON public.ai_companion_threads FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: ai_companion_threads threads_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY threads_select_own ON public.ai_companion_threads FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: ai_companion_threads threads_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY threads_update_own ON public.ai_companion_threads FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: translations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

--
-- Name: travel_clicks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.travel_clicks ENABLE ROW LEVEL SECURITY;

--
-- Name: travel_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.travel_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: ui_translations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ui_translations ENABLE ROW LEVEL SECURITY;

--
-- Name: user_notification_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: travel_plans users_manage_own_travel_plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_manage_own_travel_plans ON public.travel_plans USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: weekly_action_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.weekly_action_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: weekly_goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;

--
-- Name: weekly_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION get_ai_usage_today(p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_ai_usage_today(p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_ai_usage_today(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_ai_usage_today(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION increment_ai_usage(p_user_id uuid, p_inc integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.increment_ai_usage(p_user_id uuid, p_inc integer) TO anon;
GRANT ALL ON FUNCTION public.increment_ai_usage(p_user_id uuid, p_inc integer) TO authenticated;
GRANT ALL ON FUNCTION public.increment_ai_usage(p_user_id uuid, p_inc integer) TO service_role;


--
-- Name: FUNCTION reset_reminder_sent_on_change(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.reset_reminder_sent_on_change() TO anon;
GRANT ALL ON FUNCTION public.reset_reminder_sent_on_change() TO authenticated;
GRANT ALL ON FUNCTION public.reset_reminder_sent_on_change() TO service_role;


--
-- Name: FUNCTION set_current_timestamp_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_current_timestamp_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_current_timestamp_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_current_timestamp_updated_at() TO service_role;


--
-- Name: FUNCTION ui_translations_sync_lang(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.ui_translations_sync_lang() TO anon;
GRANT ALL ON FUNCTION public.ui_translations_sync_lang() TO authenticated;
GRANT ALL ON FUNCTION public.ui_translations_sync_lang() TO service_role;


--
-- Name: FUNCTION weekday_int_array_is_valid(a integer[]); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.weekday_int_array_is_valid(a integer[]) TO anon;
GRANT ALL ON FUNCTION public.weekday_int_array_is_valid(a integer[]) TO authenticated;
GRANT ALL ON FUNCTION public.weekday_int_array_is_valid(a integer[]) TO service_role;


--
-- Name: TABLE admin_users; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.admin_users TO anon;
GRANT ALL ON TABLE public.admin_users TO authenticated;
GRANT ALL ON TABLE public.admin_users TO service_role;


--
-- Name: TABLE ai_chat_messages; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ai_chat_messages TO anon;
GRANT ALL ON TABLE public.ai_chat_messages TO authenticated;
GRANT ALL ON TABLE public.ai_chat_messages TO service_role;


--
-- Name: TABLE ai_chat_threads; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ai_chat_threads TO anon;
GRANT ALL ON TABLE public.ai_chat_threads TO authenticated;
GRANT ALL ON TABLE public.ai_chat_threads TO service_role;


--
-- Name: TABLE ai_companion_messages; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ai_companion_messages TO anon;
GRANT ALL ON TABLE public.ai_companion_messages TO authenticated;
GRANT ALL ON TABLE public.ai_companion_messages TO service_role;


--
-- Name: TABLE ai_companion_threads; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ai_companion_threads TO anon;
GRANT ALL ON TABLE public.ai_companion_threads TO authenticated;
GRANT ALL ON TABLE public.ai_companion_threads TO service_role;


--
-- Name: TABLE ai_usage; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ai_usage TO anon;
GRANT ALL ON TABLE public.ai_usage TO authenticated;
GRANT ALL ON TABLE public.ai_usage TO service_role;


--
-- Name: TABLE app_reviews; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.app_reviews TO anon;
GRANT ALL ON TABLE public.app_reviews TO authenticated;
GRANT ALL ON TABLE public.app_reviews TO service_role;


--
-- Name: TABLE changelog_entries; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.changelog_entries TO anon;
GRANT ALL ON TABLE public.changelog_entries TO authenticated;
GRANT ALL ON TABLE public.changelog_entries TO service_role;


--
-- Name: TABLE daily_checkins; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.daily_checkins TO anon;
GRANT ALL ON TABLE public.daily_checkins TO authenticated;
GRANT ALL ON TABLE public.daily_checkins TO service_role;


--
-- Name: TABLE daily_scores; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.daily_scores TO anon;
GRANT ALL ON TABLE public.daily_scores TO authenticated;
GRANT ALL ON TABLE public.daily_scores TO service_role;


--
-- Name: TABLE email_logs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.email_logs TO anon;
GRANT ALL ON TABLE public.email_logs TO authenticated;
GRANT ALL ON TABLE public.email_logs TO service_role;


--
-- Name: SEQUENCE email_logs_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.email_logs_id_seq TO anon;
GRANT ALL ON SEQUENCE public.email_logs_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.email_logs_id_seq TO service_role;


--
-- Name: TABLE events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.events TO anon;
GRANT ALL ON TABLE public.events TO authenticated;
GRANT ALL ON TABLE public.events TO service_role;


--
-- Name: SEQUENCE events_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.events_id_seq TO anon;
GRANT ALL ON SEQUENCE public.events_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.events_id_seq TO service_role;


--
-- Name: TABLE feedback; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.feedback TO anon;
GRANT ALL ON TABLE public.feedback TO authenticated;
GRANT ALL ON TABLE public.feedback TO service_role;


--
-- Name: TABLE languages; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.languages TO anon;
GRANT ALL ON TABLE public.languages TO authenticated;
GRANT ALL ON TABLE public.languages TO service_role;


--
-- Name: TABLE notes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notes TO anon;
GRANT ALL ON TABLE public.notes TO authenticated;
GRANT ALL ON TABLE public.notes TO service_role;


--
-- Name: TABLE page_translations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.page_translations TO anon;
GRANT ALL ON TABLE public.page_translations TO authenticated;
GRANT ALL ON TABLE public.page_translations TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE push_subscriptions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.push_subscriptions TO anon;
GRANT ALL ON TABLE public.push_subscriptions TO authenticated;
GRANT ALL ON TABLE public.push_subscriptions TO service_role;


--
-- Name: TABLE tasks; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tasks TO anon;
GRANT ALL ON TABLE public.tasks TO authenticated;
GRANT ALL ON TABLE public.tasks TO service_role;


--
-- Name: TABLE template_favorites; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.template_favorites TO anon;
GRANT ALL ON TABLE public.template_favorites TO authenticated;
GRANT ALL ON TABLE public.template_favorites TO service_role;


--
-- Name: TABLE templates; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.templates TO anon;
GRANT ALL ON TABLE public.templates TO authenticated;
GRANT ALL ON TABLE public.templates TO service_role;


--
-- Name: TABLE translations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.translations TO anon;
GRANT ALL ON TABLE public.translations TO authenticated;
GRANT ALL ON TABLE public.translations TO service_role;


--
-- Name: TABLE travel_clicks; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.travel_clicks TO anon;
GRANT ALL ON TABLE public.travel_clicks TO authenticated;
GRANT ALL ON TABLE public.travel_clicks TO service_role;


--
-- Name: TABLE travel_plans; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.travel_plans TO anon;
GRANT ALL ON TABLE public.travel_plans TO authenticated;
GRANT ALL ON TABLE public.travel_plans TO service_role;


--
-- Name: TABLE ui_translations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ui_translations TO anon;
GRANT ALL ON TABLE public.ui_translations TO authenticated;
GRANT ALL ON TABLE public.ui_translations TO service_role;


--
-- Name: SEQUENCE ui_translations_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.ui_translations_id_seq TO anon;
GRANT ALL ON SEQUENCE public.ui_translations_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.ui_translations_id_seq TO service_role;


--
-- Name: TABLE user_notification_settings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_notification_settings TO anon;
GRANT ALL ON TABLE public.user_notification_settings TO authenticated;
GRANT ALL ON TABLE public.user_notification_settings TO service_role;


--
-- Name: TABLE weekly_action_plans; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.weekly_action_plans TO anon;
GRANT ALL ON TABLE public.weekly_action_plans TO authenticated;
GRANT ALL ON TABLE public.weekly_action_plans TO service_role;


--
-- Name: TABLE weekly_goals; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.weekly_goals TO anon;
GRANT ALL ON TABLE public.weekly_goals TO authenticated;
GRANT ALL ON TABLE public.weekly_goals TO service_role;


--
-- Name: TABLE weekly_reports; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.weekly_reports TO anon;
GRANT ALL ON TABLE public.weekly_reports TO authenticated;
GRANT ALL ON TABLE public.weekly_reports TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

