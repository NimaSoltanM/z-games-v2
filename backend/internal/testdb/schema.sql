--
-- PostgreSQL database dump
--

\restrict M4qEQKB9KNEJCoprgMOAd59tMw9bclSfNufGVfAi9Wp1O8g0n7VRKoWNVZdESEu

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
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


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
-- Name: capacities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.capacities (
    console_code text NOT NULL,
    code text NOT NULL,
    label_fa text NOT NULL,
    split_pct integer NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    CONSTRAINT capacities_split_pct_check CHECK ((split_pct >= 0))
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
    CONSTRAINT cart_items_quantity_check CHECK (((quantity >= 1) AND (quantity <= 10)))
);


--
-- Name: consoles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consoles (
    code text NOT NULL,
    family text NOT NULL,
    label_fa text NOT NULL,
    default_margin_pct integer DEFAULT 10 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    CONSTRAINT consoles_default_margin_pct_check CHECK ((default_margin_pct >= 0))
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
-- Name: game_base_prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.game_base_prices (
    id character varying(36) DEFAULT (gen_random_uuid())::text NOT NULL,
    game_id character varying NOT NULL,
    platform text NOT NULL,
    base_usd numeric(10,2) NOT NULL,
    capacities text[] DEFAULT '{}'::text[] NOT NULL,
    CONSTRAINT game_base_prices_base_usd_check CHECK ((base_usd > (0)::numeric))
);


--
-- Name: game_consoles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.game_consoles (
    game_id character varying NOT NULL,
    console_code text NOT NULL
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
    platform text NOT NULL,
    zarfiat text NOT NULL,
    price_usd numeric(10,2),
    price_toman integer,
    slots integer
);


--
-- Name: game_returns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.game_returns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_item_id uuid NOT NULL,
    user_id character varying NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    video_filename text,
    agreed_terms boolean DEFAULT false NOT NULL,
    reason text,
    credit_amount integer,
    reviewed_by character varying,
    reviewed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    reused_at timestamp without time zone,
    reused_for_item_id uuid,
    inventory_disabled_at timestamp without time zone,
    inventory_disabled_by character varying,
    CONSTRAINT game_returns_credit_amount_check CHECK (((credit_amount IS NULL) OR (credit_amount >= 0))),
    CONSTRAINT game_returns_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'refused'::text])))
);


--
-- Name: games; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.games (
    id character varying NOT NULL,
    name character varying(200) NOT NULL,
    cover_image character varying(500),
    price_mode public.price_mode DEFAULT 'dynamic'::public.price_mode NOT NULL,
    active boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    release_status text DEFAULT 'released'::text NOT NULL,
    release_date timestamp without time zone,
    alert_message text,
    alert_variant text,
    profit_margin_pct integer,
    slug character varying(120) NOT NULL,
    featured boolean DEFAULT false NOT NULL,
    view_count integer DEFAULT 0 NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    discount_pct smallint,
    discount_starts_at timestamp without time zone,
    discount_ends_at timestamp without time zone,
    returnable boolean DEFAULT true NOT NULL,
    return_fee_pct smallint,
    return_fee_starts_at timestamp without time zone,
    return_fee_ends_at timestamp without time zone,
    description_markdown text DEFAULT ''::text NOT NULL,
    seo_title character varying(120),
    seo_description character varying(320),
    CONSTRAINT games_alert_variant_check CHECK (((alert_variant IS NULL) OR (alert_variant = ANY (ARRAY['info'::text, 'warning'::text])))),
    CONSTRAINT games_discount_pct_check CHECK (((discount_pct IS NULL) OR ((discount_pct >= 1) AND (discount_pct <= 99)))),
    CONSTRAINT games_discount_window_check CHECK ((((discount_pct IS NULL) AND (discount_starts_at IS NULL) AND (discount_ends_at IS NULL)) OR ((discount_pct IS NOT NULL) AND (discount_starts_at IS NOT NULL) AND (discount_ends_at IS NOT NULL) AND (discount_ends_at > discount_starts_at)))),
    CONSTRAINT games_profit_margin_pct_check CHECK (((profit_margin_pct IS NULL) OR (profit_margin_pct >= 0))),
    CONSTRAINT games_release_status_check CHECK ((release_status = ANY (ARRAY['released'::text, 'pre_order'::text]))),
    CONSTRAINT games_return_fee_pct_check CHECK (((return_fee_pct IS NULL) OR ((return_fee_pct >= 0) AND (return_fee_pct <= 99)))),
    CONSTRAINT games_return_fee_window_check CHECK ((((return_fee_pct IS NULL) AND (return_fee_starts_at IS NULL) AND (return_fee_ends_at IS NULL)) OR ((return_fee_pct IS NOT NULL) AND (return_fee_starts_at IS NOT NULL) AND (return_fee_ends_at IS NOT NULL) AND (return_fee_ends_at > return_fee_starts_at))))
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
    passcode text,
    pre_order boolean DEFAULT false NOT NULL,
    CONSTRAINT order_items_quantity_check CHECK (((quantity >= 1) AND (quantity <= 10)))
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
    wallet_applied integer DEFAULT 0 NOT NULL,
    checkout_fingerprint text,
    CONSTRAINT orders_amount_check CHECK ((amount > 0)),
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text, 'fulfilled'::text]))),
    CONSTRAINT orders_wallet_applied_check CHECK (((wallet_applied >= 0) AND (wallet_applied <= amount)))
);


--
-- Name: support_ticket_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.support_ticket_number_seq
    START WITH 1000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_number bigint DEFAULT nextval('public.support_ticket_number_seq'::regclass) NOT NULL,
    user_id character varying NOT NULL,
    subject character varying(160) NOT NULL,
    category text NOT NULL,
    status text DEFAULT 'awaiting_admin'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT support_tickets_category_check CHECK ((category = ANY (ARRAY['order'::text, 'account'::text, 'payment'::text, 'return'::text, 'other'::text]))),
    CONSTRAINT support_tickets_status_check CHECK ((status = ANY (ARRAY['awaiting_admin'::text, 'awaiting_customer'::text, 'resolved'::text])))
);


--
-- Name: support_ticket_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_ticket_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    author_id character varying NOT NULL,
    body text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT support_ticket_messages_body_check CHECK (((char_length(body) >= 1) AND (char_length(body) <= 4000)))
);


--
-- Name: otp_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.otp_codes (
    id character varying NOT NULL,
    phone character varying(15) NOT NULL,
    code character varying(5),
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
    referred_by text,
    wallet_balance integer DEFAULT 0 NOT NULL,
    CONSTRAINT users_wallet_balance_check CHECK ((wallet_balance >= 0))
);


--
-- Name: verification_code_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification_code_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    order_item_id uuid NOT NULL,
    user_id character varying NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL CHECK (status = ANY (ARRAY['pending'::text, 'delivered'::text, 'expired'::text])),
    code text,
    requested_at timestamp without time zone DEFAULT now() NOT NULL,
    delivered_at timestamp without time zone,
    expires_at timestamp without time zone,
    delivered_by character varying,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT verification_code_delivery_fields_check CHECK (((status = 'pending'::text AND code IS NULL AND delivered_at IS NULL AND expires_at IS NULL AND delivered_by IS NULL) OR (status = 'delivered'::text AND code IS NOT NULL AND delivered_at IS NOT NULL AND expires_at IS NOT NULL AND delivered_by IS NOT NULL) OR (status = 'expired'::text AND code IS NULL AND delivered_at IS NOT NULL AND expires_at IS NOT NULL)))
);

CREATE UNIQUE INDEX verification_code_requests_one_pending_user_idx ON public.verification_code_requests USING btree (user_id) WHERE (status = 'pending'::text);
CREATE INDEX verification_code_requests_user_time_idx ON public.verification_code_requests USING btree (user_id, requested_at DESC);
CREATE INDEX verification_code_requests_admin_queue_idx ON public.verification_code_requests USING btree (status, requested_at DESC);
CREATE INDEX verification_code_requests_expiry_idx ON public.verification_code_requests USING btree (expires_at) WHERE (status = 'delivered'::text);


--
-- Name: wallet_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    amount integer NOT NULL,
    reason text NOT NULL,
    ref_type text,
    ref_id text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Data for Name: admin_actions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: capacities; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.capacities VALUES ('ps4', 'z1', 'ظرفیت ۱', 15, 1);
INSERT INTO public.capacities VALUES ('ps4', 'z2', 'ظرفیت ۲', 60, 2);
INSERT INTO public.capacities VALUES ('ps4', 'z3', 'ظرفیت ۳', 25, 3);
INSERT INTO public.capacities VALUES ('ps5', 'z1', 'ظرفیت ۱', 15, 1);
INSERT INTO public.capacities VALUES ('ps5', 'z2', 'ظرفیت ۲', 60, 2);
INSERT INTO public.capacities VALUES ('ps5', 'z3', 'ظرفیت ۳', 25, 3);
INSERT INTO public.capacities VALUES ('xbox_one', 'home', 'Home', 60, 1);
INSERT INTO public.capacities VALUES ('xbox_one', 'switch', 'Switch', 40, 2);
INSERT INTO public.capacities VALUES ('xbox_series', 'home', 'Home', 60, 1);
INSERT INTO public.capacities VALUES ('xbox_series', 'switch', 'Switch', 40, 2);


--
-- Data for Name: cart_items; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: consoles; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.consoles VALUES ('ps4', 'playstation', 'پلی‌استیشن ۴', 10, true, 1);
INSERT INTO public.consoles VALUES ('ps5', 'playstation', 'پلی‌استیشن ۵', 10, true, 2);
INSERT INTO public.consoles VALUES ('xbox_one', 'xbox', 'ایکس‌باکس وان', 20, true, 3);
INSERT INTO public.consoles VALUES ('xbox_series', 'xbox', 'ایکس‌باکس سری X|S', 20, true, 4);


--
-- Data for Name: exchange_rate; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: game_base_prices; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: game_consoles; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: game_links; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: game_prices; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: game_returns; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: games; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: otp_codes; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: wallet_transactions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Name: orders_order_number_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.orders_order_number_seq', 100000, false);


--
-- Name: admin_actions admin_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_actions
    ADD CONSTRAINT admin_actions_pkey PRIMARY KEY (id);


--
-- Name: capacities capacities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacities
    ADD CONSTRAINT capacities_pkey PRIMARY KEY (console_code, code);


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
-- Name: consoles consoles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consoles
    ADD CONSTRAINT consoles_pkey PRIMARY KEY (code);


--
-- Name: exchange_rate exchange_rate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rate
    ADD CONSTRAINT exchange_rate_pkey PRIMARY KEY (id);


--
-- Name: game_base_prices game_base_prices_game_id_platform_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_base_prices
    ADD CONSTRAINT game_base_prices_game_id_platform_key UNIQUE (game_id, platform);


--
-- Name: game_base_prices game_base_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_base_prices
    ADD CONSTRAINT game_base_prices_pkey PRIMARY KEY (id);


--
-- Name: game_consoles game_consoles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_consoles
    ADD CONSTRAINT game_consoles_pkey PRIMARY KEY (game_id, console_code);


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
-- Name: game_returns game_returns_order_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_returns
    ADD CONSTRAINT game_returns_order_item_id_key UNIQUE (order_item_id);


--
-- Name: game_returns game_returns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_returns
    ADD CONSTRAINT game_returns_pkey PRIMARY KEY (id);


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
-- Name: support_ticket_messages support_ticket_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_messages
    ADD CONSTRAINT support_ticket_messages_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_number_unique UNIQUE (ticket_number);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


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
-- Name: wallet_transactions wallet_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);


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
-- Name: game_returns_available_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX game_returns_available_idx ON public.game_returns USING btree (order_item_id) WHERE ((status = 'approved'::text) AND (reused_at IS NULL) AND (inventory_disabled_at IS NULL));


--
-- Name: game_returns_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX game_returns_status_idx ON public.game_returns USING btree (status);


--
-- Name: game_returns_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX game_returns_user_idx ON public.game_returns USING btree (user_id, created_at DESC);


--
-- Name: games_featured_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX games_featured_idx ON public.games USING btree (featured) WHERE featured;


--
-- Name: games_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX games_slug_key ON public.games USING btree (slug);


--
-- Name: games_tags_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX games_tags_idx ON public.games USING gin (tags);


--
-- Name: order_items_order_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_items_order_id_idx ON public.order_items USING btree (order_id);


--
-- Name: orders_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_user_id_idx ON public.orders USING btree (user_id);


--
-- Name: orders_one_pending_checkout_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX orders_one_pending_checkout_idx ON public.orders USING btree (user_id) WHERE ((status = 'pending'::text) AND (checkout_fingerprint IS NOT NULL));


--
-- Name: orders_pending_reconcile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_pending_reconcile_idx ON public.orders USING btree (created_at) WHERE (status = 'pending'::text);


--
-- Name: orders_user_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_user_created_idx ON public.orders USING btree (user_id, created_at DESC);


--
-- Name: otp_codes_cleanup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX otp_codes_cleanup_idx ON public.otp_codes USING btree (created_at) WHERE (used_at IS NOT NULL);


--
-- Name: otp_codes_phone_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX otp_codes_phone_created_idx ON public.otp_codes USING btree (phone, created_at DESC);


--
-- Name: support_ticket_messages_ticket_time_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_ticket_messages_ticket_time_idx ON public.support_ticket_messages USING btree (ticket_id, created_at, id);


--
-- Name: support_tickets_admin_queue_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_tickets_admin_queue_idx ON public.support_tickets USING btree (status, updated_at DESC);


--
-- Name: support_tickets_user_updated_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_tickets_user_updated_idx ON public.support_tickets USING btree (user_id, updated_at DESC);


--
-- Name: wallet_transactions_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wallet_transactions_user_idx ON public.wallet_transactions USING btree (user_id, created_at DESC);


--
-- Name: admin_actions admin_actions_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_actions
    ADD CONSTRAINT admin_actions_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id);


--
-- Name: capacities capacities_console_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacities
    ADD CONSTRAINT capacities_console_code_fkey FOREIGN KEY (console_code) REFERENCES public.consoles(code) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_capacity_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_capacity_fkey FOREIGN KEY (platform, zarfiat) REFERENCES public.capacities(console_code, code);


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
-- Name: game_base_prices game_base_prices_console_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_base_prices
    ADD CONSTRAINT game_base_prices_console_fkey FOREIGN KEY (platform) REFERENCES public.consoles(code);


--
-- Name: game_base_prices game_base_prices_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_base_prices
    ADD CONSTRAINT game_base_prices_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- Name: game_consoles game_consoles_console_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_consoles
    ADD CONSTRAINT game_consoles_console_code_fkey FOREIGN KEY (console_code) REFERENCES public.consoles(code);


--
-- Name: game_consoles game_consoles_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_consoles
    ADD CONSTRAINT game_consoles_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- Name: game_links game_links_game_id_games_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_links
    ADD CONSTRAINT game_links_game_id_games_id_fk FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- Name: game_prices game_prices_capacity_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_prices
    ADD CONSTRAINT game_prices_capacity_fkey FOREIGN KEY (platform, zarfiat) REFERENCES public.capacities(console_code, code);


--
-- Name: game_prices game_prices_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_prices
    ADD CONSTRAINT game_prices_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- Name: game_returns game_returns_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_returns
    ADD CONSTRAINT game_returns_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE CASCADE;


--
-- Name: game_returns game_returns_inventory_disabled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_returns
    ADD CONSTRAINT game_returns_inventory_disabled_by_fkey FOREIGN KEY (inventory_disabled_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: game_returns game_returns_reused_for_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_returns
    ADD CONSTRAINT game_returns_reused_for_item_id_fkey FOREIGN KEY (reused_for_item_id) REFERENCES public.order_items(id) ON DELETE SET NULL;


--
-- Name: game_returns game_returns_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_returns
    ADD CONSTRAINT game_returns_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: game_returns game_returns_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_returns
    ADD CONSTRAINT game_returns_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


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
-- Name: support_ticket_messages support_ticket_messages_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_messages
    ADD CONSTRAINT support_ticket_messages_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: support_ticket_messages support_ticket_messages_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_messages
    ADD CONSTRAINT support_ticket_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;


--
-- Name: support_tickets support_tickets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: wallet_transactions wallet_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: verification_code_requests verification_code_requests_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_code_requests
    ADD CONSTRAINT verification_code_requests_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE CASCADE;


--
-- Name: verification_code_requests verification_code_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_code_requests
    ADD CONSTRAINT verification_code_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: verification_code_requests verification_code_requests_delivered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_code_requests
    ADD CONSTRAINT verification_code_requests_delivered_by_fkey FOREIGN KEY (delivered_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict M4qEQKB9KNEJCoprgMOAd59tMw9bclSfNufGVfAi9Wp1O8g0n7VRKoWNVZdESEu
