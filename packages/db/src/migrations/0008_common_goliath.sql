ALTER TABLE "listing_media" ADD COLUMN "seq" bigint NOT NULL GENERATED ALWAYS AS IDENTITY (sequence name "listing_media_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1);--> statement-breakpoint
ALTER TABLE "listing_media" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "listing_media" ADD COLUMN "content_hash" text;--> statement-breakpoint
CREATE INDEX "listing_media_content_hash" ON "listing_media" USING btree ("listing_id","content_hash");