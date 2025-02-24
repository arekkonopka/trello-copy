import { sql } from 'drizzle-orm'
import { FastifyInstance } from 'fastify'

export const getTicketsHandler = async (app: FastifyInstance) => {
  const response = await app.db.execute(sql`
    SELECT * FROM tickets
    `)

  return response.rows
}
