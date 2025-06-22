--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18 (Debian 14.18-1.pgdg120+1)
-- Dumped by pg_dump version 17.5

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

-- *not* creating schema, since initdb creates it


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Ingredient; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Ingredient" (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    "unitPrice" double precision NOT NULL,
    unit character varying(255) NOT NULL,
    "stockQuantity" double precision DEFAULT '0'::double precision NOT NULL,
    "restockThreshold" double precision DEFAULT '0'::double precision NOT NULL
);


--
-- Name: Invoice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Invoice" (
    id integer NOT NULL,
    "fileName" character varying(255) NOT NULL,
    "totalAmount" double precision NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: Invoice_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Invoice_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Invoice_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Invoice_id_seq" OWNED BY public."Invoice".id;


--
-- Name: Recipe; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Recipe" (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    "totalCost" double precision DEFAULT '0'::double precision NOT NULL,
    "suggestedPrice" double precision DEFAULT '0'::double precision NOT NULL
);


--
-- Name: RecipeIngredient; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RecipeIngredient" (
    id integer NOT NULL,
    quantity double precision NOT NULL,
    "recipeId" character varying(255) NOT NULL,
    "ingredientId" character varying(255) NOT NULL
);


--
-- Name: RecipeIngredient_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."RecipeIngredient_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: RecipeIngredient_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."RecipeIngredient_id_seq" OWNED BY public."RecipeIngredient".id;


--
-- Name: Sale; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Sale" (
    id integer NOT NULL,
    "saleAmount" double precision NOT NULL,
    "recipeId" character varying(255) NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: Sale_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Sale_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Sale_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Sale_id_seq" OWNED BY public."Sale".id;


--
-- Name: Invoice id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invoice" ALTER COLUMN id SET DEFAULT nextval('public."Invoice_id_seq"'::regclass);


--
-- Name: RecipeIngredient id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RecipeIngredient" ALTER COLUMN id SET DEFAULT nextval('public."RecipeIngredient_id_seq"'::regclass);


--
-- Name: Sale id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Sale" ALTER COLUMN id SET DEFAULT nextval('public."Sale_id_seq"'::regclass);


--
-- Data for Name: Ingredient; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Ingredient" (id, name, "unitPrice", unit, "stockQuantity", "restockThreshold") FROM stdin;
ing1	Flour	2.5	kg	0	0
ing2	Sugar	1.8	kg	0	0
ing-1750582754523	Fish	20	1	500	1000
ing-1750583000763	Sugar	5	1	99990	10000000
ing-1750583170598	Avocado	3	3	5000	5000
ing-1750582356496	Egg	12	1	230	400
ing-1750587411750	Chocolate	1.5	kg	90	9.7
\.


--
-- Data for Name: Invoice; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Invoice" (id, "fileName", "totalAmount", "createdAt", "updatedAt") FROM stdin;
1	invoice1.pdf	50	2025-06-22 07:01:46.268015+00	2025-06-22 07:01:46.268015+00
2	Cover_Letter_Carl_Serquina.pdf	100	2025-06-22 08:12:11.647+00	2025-06-22 08:12:11.648+00
3	invoice-2.pdf	100	2025-06-22 08:12:57.999+00	2025-06-22 08:12:57.999+00
\.


--
-- Data for Name: Recipe; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Recipe" (id, name, "totalCost", "suggestedPrice") FROM stdin;
rec1	Cake	3.4	0
rec-1750579605629	Flour Cake	5.4	0
rec-1750582791310	Fish Cake	163	-40.75
rec-1750583017205	Sugar Delight	50	71.42857142857143
rec-1750583194494	Avocado Shale	15	Infinity
rec-1750583212016	Avocado Shake	15	21.42857142857143
rec-1750587451079	Chocolate Cake	15.3	21.85714285714286
\.


--
-- Data for Name: RecipeIngredient; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RecipeIngredient" (id, quantity, "recipeId", "ingredientId") FROM stdin;
1	1	rec1	ing1
2	0.5	rec1	ing2
3	3	rec-1750579605629	ing2
4	5	rec-1750582791310	ing-1750582754523
5	6	rec-1750582791310	ing1
6	4	rec-1750582791310	ing-1750582356496
7	10	rec-1750583017205	ing-1750583000763
8	5	rec-1750583194494	ing-1750583170598
9	5	rec-1750583212016	ing-1750583170598
10	1	rec-1750587451079	ing-1750587411750
11	1	rec-1750587451079	ing-1750582356496
12	1	rec-1750587451079	ing2
\.


--
-- Data for Name: Sale; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Sale" (id, "saleAmount", "recipeId", "createdAt", "updatedAt") FROM stdin;
1	15	rec1	2025-06-22 07:01:46.904264+00	2025-06-22 07:01:46.904264+00
2	25	rec1	2025-06-22 07:58:37.888+00	2025-06-22 07:58:37.888+00
3	25	rec1	2025-06-22 07:58:42.475+00	2025-06-22 07:58:42.476+00
4	40	rec1	2025-06-22 08:07:14.992+00	2025-06-22 08:07:14.992+00
5	10	rec-1750583017205	2025-06-22 09:03:42.964+00	2025-06-22 09:03:42.965+00
\.


--
-- Name: Invoice_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Invoice_id_seq"', 3, true);


--
-- Name: RecipeIngredient_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."RecipeIngredient_id_seq"', 12, true);


--
-- Name: Sale_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Sale_id_seq"', 5, true);


--
-- Name: Ingredient Ingredient_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Ingredient"
    ADD CONSTRAINT "Ingredient_pkey" PRIMARY KEY (id);


--
-- Name: Invoice Invoice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_pkey" PRIMARY KEY (id);


--
-- Name: RecipeIngredient RecipeIngredient_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RecipeIngredient"
    ADD CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY (id);


--
-- Name: RecipeIngredient RecipeIngredient_recipeId_ingredientId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RecipeIngredient"
    ADD CONSTRAINT "RecipeIngredient_recipeId_ingredientId_key" UNIQUE ("recipeId", "ingredientId");


--
-- Name: Recipe Recipe_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Recipe"
    ADD CONSTRAINT "Recipe_pkey" PRIMARY KEY (id);


--
-- Name: Sale Sale_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Sale"
    ADD CONSTRAINT "Sale_pkey" PRIMARY KEY (id);


--
-- Name: RecipeIngredient RecipeIngredient_ingredientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RecipeIngredient"
    ADD CONSTRAINT "RecipeIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES public."Ingredient"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RecipeIngredient RecipeIngredient_recipeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RecipeIngredient"
    ADD CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES public."Recipe"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Sale Sale_recipeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Sale"
    ADD CONSTRAINT "Sale_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES public."Recipe"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

