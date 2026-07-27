ALTER TABLE "import_feeds" ALTER COLUMN "agency_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "import_feeds" ADD COLUMN "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "import_feeds" ADD COLUMN "label" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "listing_media" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "import_feeds" ADD CONSTRAINT "import_feeds_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_feeds_created_by_user_id_index" ON "import_feeds" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "import_feeds_api_key_hash_index" ON "import_feeds" USING btree ("api_key_hash");