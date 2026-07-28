CREATE TABLE "page_views" (
	"id" uuid PRIMARY KEY NOT NULL,
	"listing_id" uuid,
	"agency_id" uuid,
	"duration_seconds" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "page_views_exactly_one_entity" CHECK (("page_views"."listing_id" IS NOT NULL)::int + ("page_views"."agency_id" IS NOT NULL)::int = 1)
);
--> statement-breakpoint
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "page_views_listing_id_created_at_index" ON "page_views" USING btree ("listing_id","created_at");--> statement-breakpoint
CREATE INDEX "page_views_agency_id_created_at_index" ON "page_views" USING btree ("agency_id","created_at");