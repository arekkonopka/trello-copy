CREATE TABLE IF NOT EXISTS "attachments" (
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_uuid" uuid NOT NULL,
	"url" varchar,
	"file_name" varchar,
	"file_type" varchar,
	"file_size" integer
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attachments" ADD CONSTRAINT "attachments_ticket_uuid_tickets_uuid_fk" FOREIGN KEY ("ticket_uuid") REFERENCES "public"."tickets"("uuid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
