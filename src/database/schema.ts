import { pgTable, uuid, varchar, boolean, jsonb } from 'drizzle-orm/pg-core'
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

export const usersRelations = relations(users, ({ one, many }) => ({
  auth: one(auth),
  session: many(session),
  jobs: many(jobs),
}))

export const auth = pgTable('auth', {
  ...createdAt,
  uuid: uuid('uuid')
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  password: varchar('password'),
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

export const session = pgTable('session', {
  ...createdAt,
  uuid: uuid('uuid')
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  user_uuid: uuid('user_uuid')
    .notNull()
    .references(() => users.uuid),
  session_id: varchar('session_id').unique(),
  expires_at: timestamp('expires_at', {
    mode: 'string',
  }),
  is_active: boolean('is_active').default(true),
})

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(users, {
    fields: [session.user_uuid],
    references: [users.uuid],
  }),
}))

export const jobs = pgTable('jobs', {
  ...createdAt,
  uuid: uuid('uuid')
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  user_uuid: uuid('user_uuid')
    .notNull()
    .references(() => users.uuid),
  name: varchar('name'),
  status: varchar('status').notNull(),
  data: jsonb('data'),
  errors: jsonb('errors'),
})

export const jobsRelations = relations(jobs, ({ one }) => ({
  user: one(users, {
    fields: [jobs.user_uuid],
    references: [users.uuid],
  }),
}))
