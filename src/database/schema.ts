import { pgTable, uuid, varchar, boolean } from 'drizzle-orm/pg-core'
import { createdAt, updatedAt } from './utils'
import { relations, sql } from 'drizzle-orm'
import { timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  ...createdAt,
  ...updatedAt,
  uuid: uuid('uuid')
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  first_name: varchar('first_name'),
  last_name: varchar('last_name'),
  email: varchar('email').unique(),
  avatar_url: varchar('avatar_url'),
})

export const usersRelations = relations(users, ({ one }) => ({
  auth: one(auth),
}))

export const auth = pgTable('auth', {
  ...createdAt,
  uuid: uuid('uuid')
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  expires_at: timestamp('expires_at', {
    mode: 'string',
  }),
  session_id: varchar('session_id'),
  password: varchar('password').notNull(),
  user_uuid: uuid('user_uuid')
    .notNull()
    .references(() => users.uuid),
  otp: varchar('otp'),
  is_email_verified: boolean('is_email_verified').default(false),
})

export const authRelations = relations(auth, ({ one }) => ({
  user: one(users, {
    fields: [auth.user_uuid],
    references: [users.uuid],
  }),
}))
