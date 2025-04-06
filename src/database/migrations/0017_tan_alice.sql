ALTER TABLE "tickets" DROP CONSTRAINT "tickets_user_uuid_users_uuid_fk";
--> statement-breakpoint
ALTER TABLE "tickets" ALTER COLUMN "description" SET DATA TYPE text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignee_uuid_users_uuid_fk" FOREIGN KEY ("assignee_uuid") REFERENCES "public"."users"("uuid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "attachments" DROP COLUMN IF EXISTS "url";
