import { pgTable, uuid, varchar } from 'drizzle-orm/pg-core'
import { createdAt, updatedAt } from './utils'
import { relations, sql } from 'drizzle-orm'
import { timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  ...createdAt,
  ...updatedAt,
  uuid: uuid('uuid')
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  first_name: varchar('first_name').notNull(),
  last_name: varchar('last_name').notNull(),
  email: varchar('email').unique(),
  avatar_url: varchar('avatar_url'),
})

export const usersRelations = relations(users, ({ one }) => ({
  auth: one(users),
}))

export const auth = pgTable('auth', {
  ...createdAt,
  expires_at: timestamp('expires_at', {
    mode: 'string',
  }).notNull(),
  session_id: uuid('uuid')
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  password: varchar('password').notNull(),
  user_uuid: uuid('user_uuid').references(() => users.uuid),
})
