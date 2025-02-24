import { Type } from '@sinclair/typebox'
import { FastifyInstance } from 'fastify'
import { ticketSchema } from './schema/ticket.schema'
import { errorSchema } from '../users/schema/error.schema'
import { getTicketsHandler } from './tickets.service'

const ticketsRoutes = (
  fastify: FastifyInstance,
  _: object,
  done: () => void
) => {
  fastify.get(
    '/tickets',
    {
      schema: {
        response: {
          200: Type.Array(ticketSchema),
          401: errorSchema,
        },
      },
      preHandler: fastify.auth([fastify.isUserLoggedIn]),
    },
    async () => {
      return getTicketsHandler(fastify)
    }
  )

  done()
}

export default ticketsRoutes
