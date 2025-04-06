CREATE TABLE IF NOT EXISTS "subscriptions" (
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_uuid" uuid NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"stripe_subscription_id" text NOT NULL,
	"stripe_price_id" text NOT NULL,
	"subscription_status" text NOT NULL,
	"subscription_start_date" timestamp NOT NULL,
	"subscription_end_date" timestamp,
	"trial_start_date" timestamp,
	"trial_end_date" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_uuid_users_uuid_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."users"("uuid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
