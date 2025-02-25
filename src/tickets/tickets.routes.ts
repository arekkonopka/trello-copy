import { Type } from '@sinclair/typebox'
import { FastifyInstance } from 'fastify'
import { ticketSchema } from './schema/ticket.schema'
import { errorSchema } from '../users/schema/error.schema'
import {
  deleteTicketHandler,
  getTicketHandler,
  getTicketsHandler,
  patchTicketHandler,
  postTicketHandler,
} from './tickets.service'
import { responseSchema } from '../schema/response.schema'
import { transformResponse } from '../utils/transformResponse'

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
          200: responseSchema(ticketSchema),
          401: errorSchema,
        },
      },
      preHandler: fastify.auth([fastify.isUserLoggedIn]),
    },
    async (_, reply) => {
      const tickets = await getTicketsHandler(fastify)
      const transformedResponse = transformResponse(tickets)

      reply.send(transformedResponse)
    }
  )

  fastify.get(
    '/tickets/:uuid',
    {
      schema: {
        response: {
          200: responseSchema(ticketSchema),
          404: errorSchema,
        },
      },
      preHandler: fastify.auth([fastify.isUserLoggedIn]),
    },
    async (request, reply) => {
      const { uuid } = request.params as { uuid: string }

      const ticket = await getTicketHandler(fastify, uuid)

      const transformedResponse = transformResponse(ticket)

      reply.send(transformedResponse)
    }
  )

  fastify.post(
    '/tickets',
    {
      schema: {
        response: {
          200: responseSchema(ticketSchema),
          404: errorSchema,
        },
      },
      preHandler: fastify.auth([fastify.isUserLoggedIn]),
    },
    async (request, reply) => {
      const response = await postTicketHandler(fastify, request)
      const transformedResponse = transformResponse(response)

      return reply.send(transformedResponse)
    }
  )

  fastify.patch(
    '/tickets/:uuid',
    {
      schema: {
        response: {
          200: responseSchema(ticketSchema),
          404: errorSchema,
        },
      },
      preHandler: fastify.auth([fastify.isUserLoggedIn]),
    },
    async (request, reply) => {
      const response = await patchTicketHandler(fastify, request)
      const transformedResponse = transformResponse(response)

      return reply.send(transformedResponse)
    }
  )

  fastify.delete(
    '/tickets/:uuid',
    {
      schema: {
        response: {
          200: responseSchema(ticketSchema),
          404: errorSchema,
        },
      },
      preHandler: fastify.auth([fastify.isUserLoggedIn]),
    },
    async (request, reply) => {
      const response = await deleteTicketHandler(fastify, request)
      const transformedResponse = transformResponse(response)

      return reply.send(transformedResponse)
    }
  )

  done()
}

export default ticketsRoutes
