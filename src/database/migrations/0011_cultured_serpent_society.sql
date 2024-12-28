ALTER TABLE "auth" ADD COLUMN "is_email_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "auth" DROP COLUMN IF EXISTS "isEmailVerified";