import { pgTable, uuid, varchar } from 'drizzle-orm/pg-core'
import { createdAt, updatedAt } from './utils'
import { sql } from 'drizzle-orm'

export const users = pgTable('users', {
  ...createdAt,
  ...updatedAt,
  uuid: uuid('uuid')
    .default(sql`uuid_generate_v4()`)
    .primaryKey(),
  first_name: varchar('first_name').notNull(),
  last_name: varchar('last_name').notNull(),
  email: varchar('email'),
  avatar_url: varchar('avatar_url'),
})
