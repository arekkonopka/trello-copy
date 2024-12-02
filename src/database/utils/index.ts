import { sql } from 'drizzle-orm'
import { timestamp } from 'drizzle-orm/pg-core'

export const createdAt = {
  createdAt: timestamp('created_at', {
    mode: 'string',
    withTimezone: true,
    precision: 3,
  })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
}
export const updatedAt = {
  updatedAt: timestamp('updated_at', {
    mode: 'string',
    withTimezone: true,
    precision: 3,
  })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
}
