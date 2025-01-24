import { pgTable, unique, timestamp, uuid, varchar, foreignKey, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const users = pgTable("users", {
	createdAt: timestamp("created_at", { precision: 3, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	uuid: uuid().defaultRandom().primaryKey().notNull(),
	firstName: varchar("first_name"),
	lastName: varchar("last_name"),
	email: varchar(),
	avatarUrl: varchar("avatar_url"),
}, (table) => {
	return {
		usersEmailUnique: unique("users_email_unique").on(table.email),
	}
});

export const auth = pgTable("auth", {
	createdAt: timestamp("created_at", { precision: 3, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	uuid: uuid().defaultRandom().primaryKey().notNull(),
	password: varchar().notNull(),
	userUuid: uuid("user_uuid").notNull(),
	sessionId: varchar("session_id"),
	otp: varchar(),
	isEmailVerified: boolean("is_email_verified").default(false),
}, (table) => {
	return {
		authUserUuidUsersUuidFk: foreignKey({
			columns: [table.userUuid],
			foreignColumns: [users.uuid],
			name: "auth_user_uuid_users_uuid_fk"
		}),
	}
});
