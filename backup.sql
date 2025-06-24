--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
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
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Ingredient; Type: TABLE; Schema: public; Owner: foodcostadmin
--

CREATE TABLE public."Ingredient" (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    "unitPrice" double precision NOT NULL,
    unit character varying(255) NOT NULL,
    "stockQuantity" double precision DEFAULT '0'::double precision NOT NULL,
    "restockThreshold" double precision DEFAULT '0'::double precision NOT NULL
);


ALTER TABLE public."Ingredient" OWNER TO foodcostadmin;

--
-- Name: Invoice; Type: TABLE; Schema: public; Owner: foodcostadmin
--

CREATE TABLE public."Invoice" (
    id integer NOT NULL,
    "fileName" character varying(255) NOT NULL,
    "totalAmount" double precision NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE public."Invoice" OWNER TO foodcostadmin;

--
-- Name: Invoice_id_seq; Type: SEQUENCE; Schema: public; Owner: foodcostadmin
--

CREATE SEQUENCE public."Invoice_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Invoice_id_seq" OWNER TO foodcostadmin;

--
-- Name: Invoice_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: foodcostadmin
--

ALTER SEQUENCE public."Invoice_id_seq" OWNED BY public."Invoice".id;


--
-- Name: Recipe; Type: TABLE; Schema: public; Owner: foodcostadmin
--

CREATE TABLE public."Recipe" (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    "totalCost" double precision DEFAULT '0'::double precision NOT NULL,
    "suggestedPrice" double precision DEFAULT '0'::double precision NOT NULL
);


ALTER TABLE public."Recipe" OWNER TO foodcostadmin;

--
-- Name: RecipeIngredient; Type: TABLE; Schema: public; Owner: foodcostadmin
--

CREATE TABLE public."RecipeIngredient" (
    id integer NOT NULL,
    quantity double precision NOT NULL,
    "recipeId" character varying(255) NOT NULL,
    "ingredientId" character varying(255) NOT NULL
);


ALTER TABLE public."RecipeIngredient" OWNER TO foodcostadmin;

--
-- Name: RecipeIngredient_id_seq; Type: SEQUENCE; Schema: public; Owner: foodcostadmin
--

CREATE SEQUENCE public."RecipeIngredient_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."RecipeIngredient_id_seq" OWNER TO foodcostadmin;

--
-- Name: RecipeIngredient_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: foodcostadmin
--

ALTER SEQUENCE public."RecipeIngredient_id_seq" OWNED BY public."RecipeIngredient".id;


--
-- Name: Sale; Type: TABLE; Schema: public; Owner: foodcostadmin
--

CREATE TABLE public."Sale" (
    id integer NOT NULL,
    "saleAmount" double precision NOT NULL,
    "recipeId" character varying(255) NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE public."Sale" OWNER TO foodcostadmin;

--
-- Name: Sale_id_seq; Type: SEQUENCE; Schema: public; Owner: foodcostadmin
--

CREATE SEQUENCE public."Sale_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Sale_id_seq" OWNER TO foodcostadmin;

--
-- Name: Sale_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: foodcostadmin
--

ALTER SEQUENCE public."Sale_id_seq" OWNED BY public."Sale".id;


--
-- Name: ingredient; Type: TABLE; Schema: public; Owner: foodcostadmin
--

CREATE TABLE public.ingredient (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    "unitPrice" numeric NOT NULL,
    unit character varying NOT NULL
);


ALTER TABLE public.ingredient OWNER TO foodcostadmin;

--
-- Name: invoice; Type: TABLE; Schema: public; Owner: foodcostadmin
--

CREATE TABLE public.invoice (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "fileName" character varying NOT NULL,
    "totalAmount" numeric NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.invoice OWNER TO foodcostadmin;

--
-- Name: recipe; Type: TABLE; Schema: public; Owner: foodcostadmin
--

CREATE TABLE public.recipe (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    "totalCost" numeric NOT NULL
);


ALTER TABLE public.recipe OWNER TO foodcostadmin;

--
-- Name: recipe_ingredient; Type: TABLE; Schema: public; Owner: foodcostadmin
--

CREATE TABLE public.recipe_ingredient (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    quantity numeric NOT NULL,
    "recipeId" uuid,
    "ingredientId" uuid
);


ALTER TABLE public.recipe_ingredient OWNER TO foodcostadmin;

--
-- Name: sale; Type: TABLE; Schema: public; Owner: foodcostadmin
--

CREATE TABLE public.sale (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "saleAmount" numeric NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "recipeId" uuid
);


ALTER TABLE public.sale OWNER TO foodcostadmin;

--
-- Name: Invoice id; Type: DEFAULT; Schema: public; Owner: foodcostadmin
--

ALTER TABLE ONLY public."Invoice" ALTER COLUMN id SET DEFAULT nextval('public."Invoice_id_seq"'::regclass);


--
-- Name: RecipeIngredient id; Type: DEFAULT; Schema: public; Owner: foodcostadmin
--

ALTER TABLE ONLY public."RecipeIngredient" ALTER COLUMN id SET DEFAULT nextval('public."RecipeIngredient_id_seq"'::regclass);


--
-- Name: Sale id; Type: DEFAULT; Schema: public; Owner: foodcostadmin
--

ALTER TABLE ONLY public."Sale" ALTER COLUMN id SET DEFAULT nextval('public."Sale_id_seq"'::regclass);


--
-- Data for Name: Ingredient; Type: TABLE DATA; Schema: public; Owner: foodcostadmin
--

COPY public."Ingredient" (id, name, "unitPrice", unit, "stockQuantity", "restockThreshold") FROM stdin;
b539fb55-66ae-40d4-a62c-b8fbda9c49eb	Oil	5	L	400	100
3a11a3e7-2b3c-4590-b9dd-1debb41b7b57	Milk	10	L	4900	100
582ada61-b1b3-41ce-a94e-08a63c121397	Baking powder	10	g	900	100
6ef7164e-381a-4ad4-96f8-b20f1fe53bf6	Cocoa Powder	4	g	900	100
e3954031-6df9-49f2-b914-fbb2623610bd	Flour	10	g	100000	100
8a88cbe1-9af4-4e46-ac78-1f1966cf2f5d	Sugar	10	g	100000	100
f764f4ee-6386-43fe-9556-e4e8bf4a5525	Eggs	12	g	100000	100
\.


--
-- Data for Name: Invoice; Type: TABLE DATA; Schema: public; Owner: foodcostadmin
--

COPY public."Invoice" (id, "fileName", "totalAmount", "createdAt", "updatedAt") FROM stdin;
1	invoice1.pdf	50	2025-06-22 07:01:46.268015+00	2025-06-22 07:01:46.268015+00
2	Cover_Letter_Carl_Serquina.pdf	100	2025-06-22 08:12:11.647+00	2025-06-22 08:12:11.648+00
3	invoice-2.pdf	100	2025-06-22 08:12:57.999+00	2025-06-22 08:12:57.999+00
\.


--
-- Data for Name: Recipe; Type: TABLE DATA; Schema: public; Owner: foodcostadmin
--

COPY public."Recipe" (id, name, "totalCost", "suggestedPrice") FROM stdin;
2ce37efc-ba72-453f-ba1f-4214fe1dcd45	Chocolate Cake	34.5	49.28571428571429
bc496d78-cc6f-4507-951a-54e283bb7f94	Vanilla Cake	32	45.714285714285715
\.


--
-- Data for Name: RecipeIngredient; Type: TABLE DATA; Schema: public; Owner: foodcostadmin
--

COPY public."RecipeIngredient" (id, quantity, "recipeId", "ingredientId") FROM stdin;
17	1	2ce37efc-ba72-453f-ba1f-4214fe1dcd45	b539fb55-66ae-40d4-a62c-b8fbda9c49eb
18	1	2ce37efc-ba72-453f-ba1f-4214fe1dcd45	3a11a3e7-2b3c-4590-b9dd-1debb41b7b57
19	1	2ce37efc-ba72-453f-ba1f-4214fe1dcd45	582ada61-b1b3-41ce-a94e-08a63c121397
20	1	2ce37efc-ba72-453f-ba1f-4214fe1dcd45	6ef7164e-381a-4ad4-96f8-b20f1fe53bf6
21	1	bc496d78-cc6f-4507-951a-54e283bb7f94	e3954031-6df9-49f2-b914-fbb2623610bd
22	1	bc496d78-cc6f-4507-951a-54e283bb7f94	8a88cbe1-9af4-4e46-ac78-1f1966cf2f5d
23	1	bc496d78-cc6f-4507-951a-54e283bb7f94	f764f4ee-6386-43fe-9556-e4e8bf4a5525
\.


--
-- Data for Name: Sale; Type: TABLE DATA; Schema: public; Owner: foodcostadmin
--

COPY public."Sale" (id, "saleAmount", "recipeId", "createdAt", "updatedAt") FROM stdin;
7	100	2ce37efc-ba72-453f-ba1f-4214fe1dcd45	2025-06-24 01:50:03.149+00	2025-06-24 01:50:03.149+00
\.


--
-- Data for Name: ingredient; Type: TABLE DATA; Schema: public; Owner: foodcostadmin
--

COPY public.ingredient (id, name, "unitPrice", unit) FROM stdin;
\.


--
-- Data for Name: invoice; Type: TABLE DATA; Schema: public; Owner: foodcostadmin
--

COPY public.invoice (id, "fileName", "totalAmount", "createdAt") FROM stdin;
\.


--
-- Data for Name: recipe; Type: TABLE DATA; Schema: public; Owner: foodcostadmin
--

COPY public.recipe (id, name, "totalCost") FROM stdin;
\.


--
-- Data for Name: recipe_ingredient; Type: TABLE DATA; Schema: public; Owner: foodcostadmin
--

COPY public.recipe_ingredient (id, quantity, "recipeId", "ingredientId") FROM stdin;
\.


--
-- Data for Name: sale; Type: TABLE DATA; Schema: public; Owner: foodcostadmin
--

COPY public.sale (id, "saleAmount", "createdAt", "recipeId") FROM stdin;
\.


--
-- Name: Invoice_id_seq; Type: SEQUENCE SET; Schema: public; Owner: foodcostadmin
--

SELECT pg_catalog.setval('public."Invoice_id_seq"', 3, true);


--
-- Name: RecipeIngredient_id_seq; Type: SEQUENCE SET; Schema: public; Owner: foodcostadmin
--

SELECT pg_catalog.setval('public."RecipeIngredient_id_seq"', 23, true);


--
-- Name: Sale_id_seq; Type: SEQUENCE SET; Schema: public; Owner: foodcostadmin
--

SELECT pg_catalog.setval('public."Sale_id_seq"', 7, true);


--
-- Name: Ingredient Ingredient_pkey; Type: CONSTRAINT; Schema: public; Owner: foodcostadmin
--

ALTER TABLE ONLY public."Ingredient"
    ADD CONSTRAINT "Ingredient_pkey" PRIMARY KEY (id);


--
-- Name: Invoice Invoice_pkey; Type: CONSTRAINT; Schema: public; Owner: foodcostadmin
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_pkey" PRIMARY KEY (id);


--
-- Name: invoice PK_15d25c200d9bcd8a33f698daf18; Type: CONSTRAINT; Schema: public; Owner: foodcostadmin
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT "PK_15d25c200d9bcd8a33f698daf18" PRIMARY KEY (id);


--
-- Name: ingredient PK_6f1e945604a0b59f56a57570e98; Type: CONSTRAINT; Schema: public; Owner: foodcostadmin
--

ALTER TABLE ONLY public.ingredient
    ADD CONSTRAINT "PK_6f1e945604a0b59f56a57570e98" PRIMARY KEY (id);


--
-- Name: recipe_ingredient PK_a13ac3f2cebdd703ac557c5377c; Type: CONSTRAINT; Schema: public; Owner: foodcostadmin
--

ALTER TABLE ONLY public.recipe_ingredient
    ADD CONSTRAINT "PK_a13ac3f2cebdd703ac557c5377c" PRIMARY KEY (id);


--
-- Name: sale PK_d03891c457cbcd22974732b5de2; Type: CONSTRAINT; Schema: public; Owner: foodcostadmin
--

ALTER TABLE ONLY public.sale
    ADD CONSTRAINT "PK_d03891c457cbcd22974732b5de2" PRIMARY KEY (id);


--
-- Name: recipe PK_e365a2fedf57238d970e07825ca; Type: CONSTRAINT; Schema: public; Owner: foodcostadmin
--

ALTER TABLE ONLY public.recipe
    ADD CONSTRAINT "PK_e365a2fedf57238d970e07825ca" PRIMARY KEY (id);


--
-- Name: RecipeIngredient RecipeIngredient_pkey; Type: CONSTRAINT; Schema: public; Owner: foodcostadmin
--

ALTER TABLE ONLY public."RecipeIngredient"
    ADD CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY (id);


--
-- Name: RecipeIngredient RecipeIngredient_recipeId_ingredientId_key; Type: CONSTRAINT; Schema: public; Owner: foodcostadmin
--

ALTER TABLE ONLY public."RecipeIngredient"
    ADD CONSTRAINT "RecipeIngredient_recipeId_ingredientId_key" UNIQUE ("recipeId", "ingredientId");


--
-- Name: Recipe Recipe_pkey; Type: CONSTRAINT; Schema: public; Owner: foodcostadmin
--

ALTER TABLE ONLY public."Recipe"
    ADD CONSTRAINT "Recipe_pkey" PRIMARY KEY (id);


--
-- Name: Sale Sale_pkey; Type: CONSTRAINT; Schema: public; Owner: foodcostadmin
--

ALTER TABLE ONLY public."Sale"
    ADD CONSTRAINT "Sale_pkey" PRIMARY KEY (id);


--
-- Name: recipe_ingredient FK_1ad3257a7350c39854071fba211; Type: FK CONSTRAINT; Schema: public; Owner: foodcostadmin
--

ALTER TABLE ONLY public.recipe_ingredient
    ADD CONSTRAINT "FK_1ad3257a7350c39854071fba211" FOREIGN KEY ("recipeId") REFERENCES public.recipe(id);


--
-- Name: recipe_ingredient FK_2879f9317daa26218b5915147e7; Type: FK CONSTRAINT; Schema: public; Owner: foodcostadmin
--

ALTER TABLE ONLY public.recipe_ingredient
    ADD CONSTRAINT "FK_2879f9317daa26218b5915147e7" FOREIGN KEY ("ingredientId") REFERENCES public.ingredient(id);


--
-- Name: sale FK_4523745ced3ecc93644bcbae503; Type: FK CONSTRAINT; Schema: public; Owner: foodcostadmin
--

ALTER TABLE ONLY public.sale
    ADD CONSTRAINT "FK_4523745ced3ecc93644bcbae503" FOREIGN KEY ("recipeId") REFERENCES public.recipe(id);


--
-- Name: RecipeIngredient RecipeIngredient_ingredientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: foodcostadmin
--

ALTER TABLE ONLY public."RecipeIngredient"
    ADD CONSTRAINT "RecipeIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES public."Ingredient"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RecipeIngredient RecipeIngredient_recipeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: foodcostadmin
--

ALTER TABLE ONLY public."RecipeIngredient"
    ADD CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES public."Recipe"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Sale Sale_recipeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: foodcostadmin
--

ALTER TABLE ONLY public."Sale"
    ADD CONSTRAINT "Sale_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES public."Recipe"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

