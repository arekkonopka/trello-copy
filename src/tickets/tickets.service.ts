import { httpErrors } from '@fastify/sensible'
import { sql } from 'drizzle-orm'
import { FastifyInstance, FastifyRequest } from 'fastify'
import { TCreateTicketSchema } from './schema/create-ticket.schema'
import { getUserBySessionId } from '../auth/auth.service'
import { TUpdateTicketSchema } from './schema/update-ticket.schema'

export const getTicketsHandler = async (app: FastifyInstance) => {
  const response = app.db.query.tickets.findMany({
    with: { attachments: true },
  })

  return response
}

export const getTicketHandler = async (app: FastifyInstance, uuid: string) => {
  const response = await app.db.execute(sql`
    SELECT * FROM tickets
    WHERE uuid = ${uuid}
    `)

  if (!response.rows.length) {
    throw httpErrors.notFound('Ticket not found')
  }

  return response.rows
}

export const postTicketHandler = async (
  app: FastifyInstance,
  request: FastifyRequest
) => {
  const sessionId = request.session?.sessionId
  const user = await getUserBySessionId(app.db, sessionId)

  if (!user) {
    throw httpErrors.notFound('User not found')
  }

  const ticketData = request.body as TCreateTicketSchema

  const result = await app.db.execute(sql`
      INSERT INTO tickets (title, description, creator_uuid)
      VALUES (${ticketData.title}, ${ticketData.description}, ${user.user_uuid})
      RETURNING *
    `)

  return result.rows
}

export const patchTicketHandler = async (
  app: FastifyInstance,
  request: FastifyRequest
) => {
  const sessionId = request.session?.sessionId
  const user = await getUserBySessionId(app.db, sessionId)

  if (!user) {
    throw httpErrors.notFound('User not found')
  }

  const ticketData = request.body as TUpdateTicketSchema
  const { uuid } = request.params as { uuid: string }

  await getTicketHandler(app, uuid)

  const result = await app.db.execute(sql`
      UPDATE tickets
      SET title = COALESCE(NULLIF(${ticketData.title}, ''), title),
          description = COALESCE(NULLIF(${
            ticketData.description ?? ''
          }, ''), description)
      WHERE uuid = ${uuid}
      RETURNING *
    `)

  return result.rows
}

export const deleteTicketHandler = async (
  app: FastifyInstance,
  request: FastifyRequest
) => {
  const { uuid } = request.params as { uuid: string }

  await getTicketHandler(app, uuid)

  const result = await app.db.execute(sql`
    DELETE FROM tickets
    WHERE uuid = ${uuid}
    RETURNING *
    `)

  return result.rows
}
