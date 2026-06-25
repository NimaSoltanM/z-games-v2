--
-- PostgreSQL database dump
--

\restrict unpm3OVFUmjCQQMOjfC4QXE8fNTuyhk07rnLqSAlGwHwdRCvDcAKMtNGx6tbBFe

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

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
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA drizzle;


--
-- Name: platform; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.platform AS ENUM (
    'ps4',
    'ps5',
    'ps4_ps5'
);


--
-- Name: price_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.price_mode AS ENUM (
    'dynamic',
    'fixed'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'user',
    'admin',
    'super_admin'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: -
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: -
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: -
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: admin_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id character varying NOT NULL,
    action text NOT NULL,
    target_type text,
    target_id text,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    game_id character varying NOT NULL,
    platform text NOT NULL,
    zarfiat text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT cart_items_platform_check CHECK ((platform = ANY (ARRAY['ps4'::text, 'ps5'::text]))),
    CONSTRAINT cart_items_quantity_check CHECK (((quantity >= 1) AND (quantity <= 10))),
    CONSTRAINT cart_items_zarfiat_check CHECK ((zarfiat = ANY (ARRAY['z1'::text, 'z2'::text, 'z3'::text])))
);


--
-- Name: exchange_rate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exchange_rate (
    id integer DEFAULT 1 NOT NULL,
    usd_to_toman integer NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: game_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.game_links (
    id character varying NOT NULL,
    game_id character varying NOT NULL,
    url character varying(500) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: game_prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.game_prices (
    id character varying(36) DEFAULT (gen_random_uuid())::text NOT NULL,
    game_id character varying NOT NULL,
    platform character varying(4) NOT NULL,
    zarfiat character varying(2) NOT NULL,
    price_usd numeric(10,2),
    price_toman integer,
    slots integer,
    CONSTRAINT game_prices_platform_check CHECK (((platform)::text = ANY ((ARRAY['ps4'::character varying, 'ps5'::character varying])::text[]))),
    CONSTRAINT game_prices_zarfiat_check CHECK (((zarfiat)::text = ANY ((ARRAY['z1'::character varying, 'z2'::character varying, 'z3'::character varying])::text[])))
);


--
-- Name: games; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.games (
    id character varying NOT NULL,
    name character varying(200) NOT NULL,
    cover_image character varying(500),
    platform public.platform NOT NULL,
    price_mode public.price_mode DEFAULT 'dynamic'::public.price_mode NOT NULL,
    active boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    release_status text DEFAULT 'released'::text NOT NULL,
    release_date timestamp without time zone,
    alert_message text,
    alert_variant text,
    CONSTRAINT games_release_status_check CHECK ((release_status = ANY (ARRAY['released'::text, 'pre_order'::text]))),
    CONSTRAINT games_alert_variant_check CHECK (((alert_variant IS NULL) OR (alert_variant = ANY (ARRAY['info'::text, 'warning'::text]))))
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    game_id character varying NOT NULL,
    game_name text NOT NULL,
    platform text NOT NULL,
    zarfiat text NOT NULL,
    quantity integer NOT NULL,
    email text,
    password text,
    psn_pass text,
    pre_order boolean DEFAULT false NOT NULL,
    CONSTRAINT order_items_platform_check CHECK ((platform = ANY (ARRAY['ps4'::text, 'ps5'::text]))),
    CONSTRAINT order_items_quantity_check CHECK (((quantity >= 1) AND (quantity <= 10))),
    CONSTRAINT order_items_zarfiat_check CHECK ((zarfiat = ANY (ARRAY['z1'::text, 'z2'::text, 'z3'::text])))
);


--
-- Name: orders_order_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orders_order_number_seq
    START WITH 100000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    amount integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    authority text,
    ref_id bigint,
    referral_code text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    order_number bigint DEFAULT nextval('public.orders_order_number_seq'::regclass) NOT NULL,
    CONSTRAINT orders_amount_check CHECK ((amount > 0)),
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text, 'fulfilled'::text])))
);


--
-- Name: otp_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.otp_codes (
    id character varying NOT NULL,
    phone character varying(15) NOT NULL,
    code character varying(5) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    attempts integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character varying NOT NULL,
    phone character varying(15) NOT NULL,
    first_name character varying(50),
    last_name character varying(50),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    role public.user_role DEFAULT 'user'::public.user_role NOT NULL,
    referred_by text
);


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: admin_actions admin_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_actions
    ADD CONSTRAINT admin_actions_pkey PRIMARY KEY (id);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: cart_items cart_items_user_id_game_id_platform_zarfiat_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_user_id_game_id_platform_zarfiat_key UNIQUE (user_id, game_id, platform, zarfiat);


--
-- Name: exchange_rate exchange_rate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rate
    ADD CONSTRAINT exchange_rate_pkey PRIMARY KEY (id);


--
-- Name: game_links game_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_links
    ADD CONSTRAINT game_links_pkey PRIMARY KEY (id);


--
-- Name: game_links game_links_url_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_links
    ADD CONSTRAINT game_links_url_unique UNIQUE (url);


--
-- Name: game_prices game_prices_game_id_platform_zarfiat_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_prices
    ADD CONSTRAINT game_prices_game_id_platform_zarfiat_key UNIQUE (game_id, platform, zarfiat);


--
-- Name: game_prices game_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_prices
    ADD CONSTRAINT game_prices_pkey PRIMARY KEY (id);


--
-- Name: games games_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_authority_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_authority_key UNIQUE (authority);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: otp_codes otp_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otp_codes
    ADD CONSTRAINT otp_codes_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_unique UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: admin_actions_admin_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admin_actions_admin_id_idx ON public.admin_actions USING btree (admin_id);


--
-- Name: admin_actions_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admin_actions_created_at_idx ON public.admin_actions USING btree (created_at DESC);


--
-- Name: admin_actions_target_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admin_actions_target_idx ON public.admin_actions USING btree (target_type, target_id);


--
-- Name: order_items_order_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_items_order_id_idx ON public.order_items USING btree (order_id);


--
-- Name: orders_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_user_id_idx ON public.orders USING btree (user_id);


--
-- Name: otp_codes_phone_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX otp_codes_phone_idx ON public.otp_codes USING btree (phone);


--
-- Name: admin_actions admin_actions_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_actions
    ADD CONSTRAINT admin_actions_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id);


--
-- Name: cart_items cart_items_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: game_links game_links_game_id_games_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_links
    ADD CONSTRAINT game_links_game_id_games_id_fk FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- Name: game_prices game_prices_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_prices
    ADD CONSTRAINT game_prices_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict unpm3OVFUmjCQQMOjfC4QXE8fNTuyhk07rnLqSAlGwHwdRCvDcAKMtNGx6tbBFe

