ALTER TYPE "public"."import_feed_type" ADD VALUE 'xml_rpc';--> statement-breakpoint
CREATE TABLE "import_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"feed_id" uuid NOT NULL,
	"fixed_part" text NOT NULL,
	"session_id" text NOT NULL,
	"is_authorized" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "import_sessions_fixedPart_unique" UNIQUE("fixed_part")
);
--> statement-breakpoint
ALTER TABLE "import_feeds" ADD COLUMN "client_id" integer;--> statement-breakpoint
ALTER TABLE "import_feeds" ADD COLUMN "import_password_md5" text;--> statement-breakpoint
ALTER TABLE "import_feeds" ADD COLUMN "software_key" text;--> statement-breakpoint
ALTER TABLE "import_sessions" ADD CONSTRAINT "import_sessions_feed_id_import_feeds_id_fk" FOREIGN KEY ("feed_id") REFERENCES "public"."import_feeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_sessions_feed_id_index" ON "import_sessions" USING btree ("feed_id");--> statement-breakpoint
CREATE INDEX "import_sessions_expires_at_index" ON "import_sessions" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "import_feeds" ADD CONSTRAINT "import_feeds_clientId_unique" UNIQUE("client_id");