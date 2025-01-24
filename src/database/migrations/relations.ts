import { relations } from "drizzle-orm/relations";
import { users, auth } from "./schema";

export const authRelations = relations(auth, ({one}) => ({
	user: one(users, {
		fields: [auth.userUuid],
		references: [users.uuid]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	auths: many(auth),
}));