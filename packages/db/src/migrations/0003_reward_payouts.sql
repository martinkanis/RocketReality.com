CREATE TYPE "public"."reward_payout_status" AS ENUM('detected', 'approved', 'paid', 'rejected');--> statement-breakpoint
CREATE TABLE "reward_payouts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"listing_id" uuid NOT NULL,
	"media_id" uuid,
	"iban" text NOT NULL,
	"bic" text,
	"amount_czk" numeric(10, 2) NOT NULL,
	"spayd_raw" text NOT NULL,
	"status" "reward_payout_status" DEFAULT 'detected' NOT NULL,
	"approved_by_user_id" text,
	"approved_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reward_payouts" ADD CONSTRAINT "reward_payouts_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_payouts" ADD CONSTRAINT "reward_payouts_media_id_listing_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."listing_media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_payouts" ADD CONSTRAINT "reward_payouts_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reward_payouts_listing_unique" ON "reward_payouts" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "reward_payouts_status_index" ON "reward_payouts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reward_payouts_iban_index" ON "reward_payouts" USING btree ("iban");