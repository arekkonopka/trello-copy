import {
  pgTable,
  uuid,
  varchar,
  boolean,
  jsonb,
  integer,
  text,
} from 'drizzle-orm/pg-core'
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
  ticketAssignee: many(tickets, {
    relationName: 'ticket_assignee',
  }),
  ticket_creator: many(tickets, {
    relationName: 'ticket_creator',
  }),
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

export const tickets = pgTable('tickets', {
  ...createdAt,
  ...updatedAt,
  uuid: uuid('uuid')
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  title: varchar('title'),
  description: text('description'),
  assignee_uuid: uuid('assignee_uuid').references(() => users.uuid),
  creator_uuid: uuid('creator_uuid')
    .notNull()
    .references(() => users.uuid),
})

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  ticketAssignee: one(users, {
    fields: [tickets.assignee_uuid],
    references: [users.uuid],
    relationName: 'ticket_assignee',
  }),
  ticketCreator: one(users, {
    fields: [tickets.creator_uuid],
    references: [users.uuid],
    relationName: 'ticket_creator',
  }),
  attachments: many(attachments),
}))

export const attachments = pgTable('attachments', {
  ...createdAt,
  ...updatedAt,
  uuid: uuid('uuid')
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  ticket_uuid: uuid('ticket_uuid')
    .notNull()
    .references(() => tickets.uuid),
  file_name: varchar('file_name'),
  file_type: varchar('file_type'),
  file_size: integer('file_size'),
})

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  ticket: one(tickets, {
    fields: [attachments.ticket_uuid],
    references: [tickets.uuid],
  }),
}))
