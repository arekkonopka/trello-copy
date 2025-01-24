CREATE TABLE IF NOT EXISTS "session" (
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_uuid" uuid NOT NULL,
	"session_id" varchar,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "session_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session" ADD CONSTRAINT "session_user_uuid_users_uuid_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."users"("uuid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "auth" DROP COLUMN IF EXISTS "expires_at";--> statement-breakpoint
ALTER TABLE "auth" DROP COLUMN IF EXISTS "session_id";