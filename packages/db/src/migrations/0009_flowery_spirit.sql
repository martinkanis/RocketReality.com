ALTER TABLE "listing_media" ADD COLUMN "payment_qr_spayd" text;--> statement-breakpoint
ALTER TABLE "reward_payouts" ADD COLUMN "beneficiary_user_id" text;--> statement-breakpoint
ALTER TABLE "reward_payouts" ADD COLUMN "beneficiary_agency_id" uuid;--> statement-breakpoint
ALTER TABLE "reward_payouts" ADD CONSTRAINT "reward_payouts_beneficiary_user_id_users_id_fk" FOREIGN KEY ("beneficiary_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_payouts" ADD CONSTRAINT "reward_payouts_beneficiary_agency_id_agencies_id_fk" FOREIGN KEY ("beneficiary_agency_id") REFERENCES "public"."agencies"("id") ON DELETE set null ON UPDATE no action;