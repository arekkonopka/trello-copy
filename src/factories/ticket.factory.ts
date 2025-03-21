import { Factory } from 'fishery'
import { TTicketSchema } from '../tickets/schema/ticket.schema'
import { Partial } from '@sinclair/typebox'
import { faker } from '@faker-js/faker'
import { randomUUID } from 'crypto'
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '../database/schema'
import { sql } from 'drizzle-orm'

export const ticketFactory = Factory.define<Partial<TTicketSchema>>(
  ({ params, associations }) => {
    return {
      uuid: randomUUID(),
      title: params.title ?? faker.lorem.sentence(),
      description: params.description ?? faker.lorem.paragraph(),
      assignee_uuid: associations.assignee_uuid ?? null,
      creator_uuid: associations.creator_uuid ?? randomUUID(),
    }
  }
)

export const createTicket = async (
  db: PostgresJsDatabase<typeof schema>,
  overrides?: Partial<TTicketSchema>
) => {
  const ticket = ticketFactory.build(
    {
      ...overrides,
    },
    { associations: { ...overrides } }
  )

  const result = await db.execute(sql`
    INSERT INTO tickets 
    (title, description, creator_uuid, assignee_uuid)
    VALUES (${ticket.title}, ${ticket.description}, ${ticket.creator_uuid}, ${ticket.assignee_uuid})
    RETURNING *
    `)

  return result.rows[0]
}
