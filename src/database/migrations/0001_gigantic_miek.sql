-- ASK: dodalem tutaj rozszerzenie, czy mozna to dodawac tak z palca? orzez to ze tutaj bylo uuuid_generate to w testach wymaalo tego
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE "users" ADD PRIMARY KEY ("uuid");--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "uuid" SET DEFAULT uuid_generate_v4();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "uuid" SET NOT NULL;
