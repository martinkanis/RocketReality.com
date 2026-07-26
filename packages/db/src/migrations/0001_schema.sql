CREATE TYPE "public"."account_type" AS ENUM('soukromnik', 'profesional');--> statement-breakpoint
CREATE TYPE "public"."address_visibility" AS ENUM('presna', 'ulice', 'obec');--> statement-breakpoint
CREATE TYPE "public"."agency_role" AS ENUM('owner', 'admin', 'makler');--> statement-breakpoint
CREATE TYPE "public"."agency_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."archive_reason" AS ENUM('prodano', 'pronajato', 'stazeno_inzerentem', 'jine');--> statement-breakpoint
CREATE TYPE "public"."boost_type" AS ENUM('top');--> statement-breakpoint
CREATE TYPE "public"."building_condition" AS ENUM('novostavba', 'velmi_dobry', 'dobry', 'spatny', 've_vystavbe', 'projekt', 'pred_rekonstrukci', 'v_rekonstrukci', 'po_rekonstrukci', 'k_demolici');--> statement-breakpoint
CREATE TYPE "public"."building_type" AS ENUM('cihlova', 'panelova', 'drevostavba', 'skeletova', 'montovana', 'smisena', 'kamenna', 'jina');--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('CZK', 'EUR');--> statement-breakpoint
CREATE TYPE "public"."disposition" AS ENUM('1+kk', '1+1', '2+kk', '2+1', '3+kk', '3+1', '4+kk', '4+1', '5+kk', '5+1', '6+', 'atypicky', 'pokoj');--> statement-breakpoint
CREATE TYPE "public"."energy_label" AS ENUM('A', 'B', 'C', 'D', 'E', 'F', 'G');--> statement-breakpoint
CREATE TYPE "public"."furnishing_type" AS ENUM('zarizeno', 'castecne_zarizeno', 'nezarizeno');--> statement-breakpoint
CREATE TYPE "public"."import_feed_type" AS ENUM('api_push', 'xml_feed');--> statement-breakpoint
CREATE TYPE "public"."import_job_status" AS ENUM('pending', 'running', 'done', 'partial', 'failed');--> statement-breakpoint
CREATE TYPE "public"."kraj" AS ENUM('praha', 'stredocesky', 'jihocesky', 'plzensky', 'karlovarsky', 'ustecky', 'liberecky', 'kralovehradecky', 'pardubicky', 'vysocina', 'jihomoravsky', 'olomoucky', 'zlinsky', 'moravskoslezsky');--> statement-breakpoint
CREATE TYPE "public"."listing_source" AS ENUM('manual', 'import');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('draft', 'pending_review', 'active', 'paused', 'expired', 'archived', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('foto', 'pudorys', 'dokument');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('new', 'read', 'replied', 'spam');--> statement-breakpoint
CREATE TYPE "public"."moderation_reason" AS ENUM('duplicita', 'zakazany_obsah', 'spatna_kategorie', 'podezreni_na_podvod', 'nekvalitni_obsah', 'spatna_cena', 'jine');--> statement-breakpoint
CREATE TYPE "public"."moderation_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('email', 'in_app');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('queued', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('hlidaci_pes', 'zlevneni', 'konci_platnost', 'nova_zprava', 'odpoved_na_recenzi', 'moderace_vysledek', 'system');--> statement-breakpoint
CREATE TYPE "public"."order_item_type" AS ENUM('publikace', 'prodlouzeni', 'topovani');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('created', 'pending_payment', 'paid', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."orientation" AS ENUM('sever', 'jih', 'vychod', 'zapad', 'severovychod', 'jihovychod', 'severozapad', 'jihozapad');--> statement-breakpoint
CREATE TYPE "public"."ownership_type" AS ENUM('osobni', 'druzstevni', 'statni_obecni');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('free', 'stripe');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'succeeded', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."price_unit" AS ENUM('celkem', 'za_m2', 'za_mesic', 'za_m2_mesic', 'za_m2_rok', 'dohodou');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."saved_search_frequency" AS ENUM('okamzite', 'denne', 'tydne');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('prodej', 'pronajem', 'drazba');--> statement-breakpoint
CREATE TYPE "public"."import_action" AS ENUM('create', 'update', 'archive', 'skip');--> statement-breakpoint
CREATE TYPE "public"."import_item_status" AS ENUM('ok', 'error');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"impersonated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" "citext" NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"phone" text,
	"account_type" "account_type" DEFAULT 'soukromnik' NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories_main" (
	"id" smallint PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "categories_main_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "categories_sub" (
	"id" smallint PRIMARY KEY NOT NULL,
	"main_id" smallint NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "districts" (
	"id" smallint PRIMARY KEY NOT NULL,
	"kraj" "kraj" NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "districts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "municipalities" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "municipalities_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"district_id" smallint NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"ruian_kod" integer,
	"centroid" geometry(point),
	CONSTRAINT "municipalities_slug_unique" UNIQUE("slug"),
	CONSTRAINT "municipalities_ruianKod_unique" UNIQUE("ruian_kod")
);
--> statement-breakpoint
CREATE TABLE "agencies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"ico" varchar(8),
	"dic" varchar(12),
	"ares_data" jsonb,
	"ares_synced_at" timestamp with time zone,
	"logo_key" text,
	"description" text,
	"web" text,
	"email" text,
	"phone" text,
	"street" text,
	"city" text,
	"postal_code" varchar(5),
	"gps" geometry(point),
	"status" "agency_status" DEFAULT 'active' NOT NULL,
	"rating_avg" numeric(2, 1),
	"rating_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agencies_slug_unique" UNIQUE("slug"),
	CONSTRAINT "agencies_ico_unique" UNIQUE("ico"),
	CONSTRAINT "agencies_ico_format" CHECK ("agencies"."ico" IS NULL OR "agencies"."ico" ~ '^\d{8}$')
);
--> statement-breakpoint
CREATE TABLE "agency_members" (
	"agency_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "agency_role" DEFAULT 'makler' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"invited_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agency_members_agency_id_user_id_pk" PRIMARY KEY("agency_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "import_feeds" (
	"id" uuid PRIMARY KEY NOT NULL,
	"agency_id" uuid NOT NULL,
	"type" "import_feed_type" NOT NULL,
	"api_key_hash" text,
	"config" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_media" (
	"id" uuid PRIMARY KEY NOT NULL,
	"listing_id" uuid NOT NULL,
	"kind" "media_kind" DEFAULT 'foto' NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"storage_key" text NOT NULL,
	"alt" text,
	"mime" text,
	"file_size" integer,
	"width" integer,
	"height" integer,
	"blurhash" text,
	"variants" jsonb,
	"is_ready" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "listings_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"agency_id" uuid,
	"transaction" "transaction_type" NOT NULL,
	"category_main_id" smallint NOT NULL,
	"category_sub_id" smallint,
	"disposition" "disposition",
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"video_url" text,
	"virtual_tour_url" text,
	"price_amount" numeric(14, 2),
	"price_currency" "currency" DEFAULT 'CZK' NOT NULL,
	"price_unit" "price_unit" DEFAULT 'celkem' NOT NULL,
	"price_note" text,
	"price_hidden" boolean DEFAULT false NOT NULL,
	"monthly_fees" numeric(12, 2),
	"deposit" numeric(12, 2),
	"area_usable" numeric(10, 2),
	"area_built_up" numeric(10, 2),
	"area_land" numeric(10, 2),
	"area_garden" numeric(10, 2),
	"floor_number" smallint,
	"floors_total" smallint,
	"ownership" "ownership_type",
	"building_type" "building_type",
	"building_condition" "building_condition",
	"furnishing" "furnishing_type",
	"energy_label" "energy_label" DEFAULT 'G' NOT NULL,
	"penb" jsonb,
	"has_balcony" boolean DEFAULT false NOT NULL,
	"balcony_area" numeric(6, 2),
	"has_terrace" boolean DEFAULT false NOT NULL,
	"terrace_area" numeric(6, 2),
	"has_loggia" boolean DEFAULT false NOT NULL,
	"loggia_area" numeric(6, 2),
	"has_cellar" boolean DEFAULT false NOT NULL,
	"cellar_area" numeric(6, 2),
	"has_elevator" boolean DEFAULT false NOT NULL,
	"has_garage" boolean DEFAULT false NOT NULL,
	"garage_count" smallint,
	"has_parking" boolean DEFAULT false NOT NULL,
	"parking_count" smallint,
	"barrier_free" boolean DEFAULT false NOT NULL,
	"orientation" "orientation"[],
	"available_from" date,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"kraj" "kraj" NOT NULL,
	"district_id" smallint NOT NULL,
	"municipality_id" integer NOT NULL,
	"municipality_part" text,
	"street" text,
	"street_number" text,
	"postal_code" varchar(5),
	"location_point" geometry(point) NOT NULL,
	"address_visibility" "address_visibility" DEFAULT 'presna' NOT NULL,
	"ruian_adm_id" bigint,
	"status" "listing_status" DEFAULT 'draft' NOT NULL,
	"status_changed_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"archive_reason" "archive_reason",
	"rejected_reason" text,
	"source" "listing_source" DEFAULT 'manual' NOT NULL,
	"import_feed_id" uuid,
	"external_id" text,
	"topped_until" timestamp with time zone,
	"view_count" integer DEFAULT 0 NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', immutable_unaccent(coalesce(title, '') || ' ' || coalesce(description, '')))) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "listings_slug_unique" UNIQUE("slug"),
	CONSTRAINT "listings_byty_disposition" CHECK ("listings"."category_main_id" <> 1 OR "listings"."disposition" IS NOT NULL OR "listings"."status" = 'draft')
);
--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"listing_id" uuid NOT NULL,
	"price_amount" numeric(14, 2),
	"price_currency" "currency" NOT NULL,
	"price_unit" "price_unit" NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"listing_id" uuid NOT NULL,
	"sender_user_id" text,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"message" text NOT NULL,
	"status" "message_status" DEFAULT 'new' NOT NULL,
	"ip" "inet",
	"user_agent" text,
	"honeypot_triggered" boolean DEFAULT false NOT NULL,
	"spam_score" smallint DEFAULT 0 NOT NULL,
	"consent_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_messages_spam_score" CHECK ("contact_messages"."spam_score" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"user_id" text NOT NULL,
	"listing_id" uuid NOT NULL,
	"note" text,
	"price_at_save" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_user_id_listing_id_pk" PRIMARY KEY("user_id","listing_id")
);
--> statement-breakpoint
CREATE TABLE "saved_searches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"filters" jsonb NOT NULL,
	"frequency" "saved_search_frequency" DEFAULT 'denne' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_notified_at" timestamp with time zone,
	"last_seen_published_at" timestamp with time zone,
	"unsubscribe_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_searches_unsubscribeToken_unique" UNIQUE("unsubscribe_token")
);
--> statement-breakpoint
CREATE TABLE "agency_reviews" (
	"id" uuid PRIMARY KEY NOT NULL,
	"agency_id" uuid NOT NULL,
	"author_user_id" text NOT NULL,
	"rating" smallint NOT NULL,
	"text" text,
	"moderation_status" "review_status" DEFAULT 'pending' NOT NULL,
	"moderation_reason" "moderation_reason",
	"reply_text" text,
	"replied_at" timestamp with time zone,
	"replied_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agency_reviews_rating_range" CHECK ("agency_reviews"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "listing_stats_daily" (
	"listing_id" uuid NOT NULL,
	"stat_date" date NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"detail_views" integer DEFAULT 0 NOT NULL,
	"phone_reveals" integer DEFAULT 0 NOT NULL,
	"messages" integer DEFAULT 0 NOT NULL,
	"favorites_added" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "listing_stats_daily_listing_id_stat_date_pk" PRIMARY KEY("listing_id","stat_date")
);
--> statement-breakpoint
CREATE TABLE "boosts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"listing_id" uuid NOT NULL,
	"order_item_id" uuid,
	"type" "boost_type" DEFAULT 'top' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"type" "order_item_type" NOT NULL,
	"product_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"user_id" text NOT NULL,
	"agency_id" uuid,
	"status" "order_status" DEFAULT 'created' NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT 0 NOT NULL,
	"currency" "currency" DEFAULT 'CZK' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	CONSTRAINT "orders_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" "currency" DEFAULT 'CZK' NOT NULL,
	"idempotency_key" text NOT NULL,
	"stripe_payment_intent_id" text,
	"stripe_checkout_session_id" text,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	CONSTRAINT "payments_idempotencyKey_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "payments_stripePaymentIntentId_unique" UNIQUE("stripe_payment_intent_id")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"price" numeric(10, 2) DEFAULT 0 NOT NULL,
	"currency" "currency" DEFAULT 'CZK' NOT NULL,
	"duration_days" smallint NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "stripe_webhook_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"stripe_event_id" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stripe_webhook_events_stripeEventId_unique" UNIQUE("stripe_event_id")
);
--> statement-breakpoint
CREATE TABLE "import_job_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"job_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"listing_id" uuid,
	"action" "import_action" NOT NULL,
	"status" "import_item_status" NOT NULL,
	"errors" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"feed_id" uuid NOT NULL,
	"status" "import_job_status" DEFAULT 'pending' NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"stats" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_cases" (
	"id" uuid PRIMARY KEY NOT NULL,
	"listing_id" uuid NOT NULL,
	"status" "moderation_status" DEFAULT 'pending' NOT NULL,
	"reason_code" "moderation_reason",
	"note" text,
	"moderator_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"channel" "notification_channel" DEFAULT 'email' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"listing_id" uuid,
	"saved_search_id" uuid,
	"status" "notification_status" DEFAULT 'queued' NOT NULL,
	"sent_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories_sub" ADD CONSTRAINT "categories_sub_main_id_categories_main_id_fk" FOREIGN KEY ("main_id") REFERENCES "public"."categories_main"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "municipalities" ADD CONSTRAINT "municipalities_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_members" ADD CONSTRAINT "agency_members_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_members" ADD CONSTRAINT "agency_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_feeds" ADD CONSTRAINT "import_feeds_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_media" ADD CONSTRAINT "listing_media_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_category_main_id_categories_main_id_fk" FOREIGN KEY ("category_main_id") REFERENCES "public"."categories_main"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_category_sub_id_categories_sub_id_fk" FOREIGN KEY ("category_sub_id") REFERENCES "public"."categories_sub"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_import_feed_id_import_feeds_id_fk" FOREIGN KEY ("import_feed_id") REFERENCES "public"."import_feeds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_reviews" ADD CONSTRAINT "agency_reviews_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_reviews" ADD CONSTRAINT "agency_reviews_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_reviews" ADD CONSTRAINT "agency_reviews_replied_by_user_id_users_id_fk" FOREIGN KEY ("replied_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_stats_daily" ADD CONSTRAINT "listing_stats_daily_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boosts" ADD CONSTRAINT "boosts_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boosts" ADD CONSTRAINT "boosts_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_job_items" ADD CONSTRAINT "import_job_items_job_id_import_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."import_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_job_items" ADD CONSTRAINT "import_job_items_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_feed_id_import_feeds_id_fk" FOREIGN KEY ("feed_id") REFERENCES "public"."import_feeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_cases" ADD CONSTRAINT "moderation_cases_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_cases" ADD CONSTRAINT "moderation_cases_moderator_user_id_users_id_fk" FOREIGN KEY ("moderator_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_saved_search_id_saved_searches_id_fk" FOREIGN KEY ("saved_search_id") REFERENCES "public"."saved_searches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_index" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_index" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_index" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "verifications_identifier_index" ON "verifications" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "municipalities_district_id_index" ON "municipalities" USING btree ("district_id");--> statement-breakpoint
CREATE INDEX "municipalities_name_index" ON "municipalities" USING btree ("name");--> statement-breakpoint
CREATE INDEX "agency_members_user_id_index" ON "agency_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "import_feeds_agency_id_index" ON "import_feeds" USING btree ("agency_id");--> statement-breakpoint
CREATE INDEX "listing_media_listing_id_kind_position_index" ON "listing_media" USING btree ("listing_id","kind","position");--> statement-breakpoint
CREATE UNIQUE INDEX "listings_seq_unique" ON "listings" USING btree ("seq");--> statement-breakpoint
CREATE UNIQUE INDEX "listings_agency_external_unique" ON "listings" USING btree ("agency_id","external_id") WHERE "listings"."external_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "listings_search_main" ON "listings" USING btree ("transaction","category_main_id","kraj","price_amount") WHERE "listings"."status" = 'active';--> statement-breakpoint
CREATE INDEX "listings_search_disposition" ON "listings" USING btree ("transaction","category_main_id","disposition","district_id") WHERE "listings"."status" = 'active';--> statement-breakpoint
CREATE INDEX "listings_search_municipality" ON "listings" USING btree ("municipality_id","transaction","category_main_id") WHERE "listings"."status" = 'active';--> statement-breakpoint
CREATE INDEX "listings_ordering" ON "listings" USING btree ("topped_until" DESC NULLS LAST,"published_at" DESC) WHERE "listings"."status" = 'active';--> statement-breakpoint
CREATE INDEX "listings_geo" ON "listings" USING gist ("location_point") WHERE "listings"."status" = 'active';--> statement-breakpoint
CREATE INDEX "listings_fts" ON "listings" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "listings_attributes" ON "listings" USING gin ("attributes");--> statement-breakpoint
CREATE INDEX "listings_expiration" ON "listings" USING btree ("valid_until") WHERE "listings"."status" = 'active';--> statement-breakpoint
CREATE INDEX "listings_owner" ON "listings" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "listings_agency" ON "listings" USING btree ("agency_id");--> statement-breakpoint
CREATE INDEX "price_history_listing_id_recorded_at_index" ON "price_history" USING btree ("listing_id","recorded_at");--> statement-breakpoint
CREATE INDEX "contact_messages_listing_id_created_at_index" ON "contact_messages" USING btree ("listing_id","created_at");--> statement-breakpoint
CREATE INDEX "contact_messages_rate_limit" ON "contact_messages" USING btree ("ip","created_at");--> statement-breakpoint
CREATE INDEX "favorites_listing_id_index" ON "favorites" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "saved_searches_user_id_index" ON "saved_searches" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "saved_searches_scheduler" ON "saved_searches" USING btree ("frequency","last_notified_at") WHERE "saved_searches"."is_active";--> statement-breakpoint
CREATE UNIQUE INDEX "agency_reviews_author_unique" ON "agency_reviews" USING btree ("agency_id","author_user_id");--> statement-breakpoint
CREATE INDEX "agency_reviews_public" ON "agency_reviews" USING btree ("agency_id") WHERE "agency_reviews"."moderation_status" = 'approved';--> statement-breakpoint
CREATE INDEX "boosts_listing_id_ends_at_index" ON "boosts" USING btree ("listing_id","ends_at");--> statement-breakpoint
CREATE INDEX "order_items_order_id_index" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_listing_id_index" ON "order_items" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "orders_user_id_created_at_index" ON "orders" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "payments_order_id_index" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "import_job_items_job_id_index" ON "import_job_items" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "import_jobs_feed_id_created_at_index" ON "import_jobs" USING btree ("feed_id","created_at");--> statement-breakpoint
CREATE INDEX "moderation_cases_queue" ON "moderation_cases" USING btree ("created_at") WHERE "moderation_cases"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "moderation_cases_listing_id_index" ON "moderation_cases" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "notifications_user_id_created_at_index" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_pending" ON "notifications" USING btree ("created_at") WHERE "notifications"."status" = 'queued';