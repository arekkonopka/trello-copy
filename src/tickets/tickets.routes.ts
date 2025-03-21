import { FastifyInstance } from 'fastify'
import {
  ticketSchema,
  ticketSchemaWithAttachments,
} from './schema/ticket.schema'
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
import {
  createTicketSchema,
  TCreateTicketSchema,
} from './schema/create-ticket.schema'
import {
  TUpdateTicketSchema,
  updateTicketSchema,
} from './schema/update-ticket.schema'
import { Type } from '@sinclair/typebox'

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
          200: responseSchema(ticketSchemaWithAttachments),
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

  fastify.post<{ Body: TCreateTicketSchema }>(
    '/tickets',
    {
      schema: {
        body: createTicketSchema,

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

  fastify.patch<{ Body: TUpdateTicketSchema; Params: { uuid: string } }>(
    '/tickets/:uuid',
    {
      schema: {
        body: updateTicketSchema,
        response: {
          200: responseSchema(ticketSchema),
          404: errorSchema,
        },
        params: Type.Object({
          uuid: Type.String({ format: 'uuid' }),
        }),
      },
      preHandler: fastify.auth([fastify.isUserLoggedIn]),
    },
    async (request, reply) => {
      const response = await patchTicketHandler(fastify, request)
      const transformedResponse = transformResponse(response)

      return reply.send(transformedResponse)
    }
  )

  fastify.delete<{ Params: { uuid: string } }>(
    '/tickets/:uuid',
    {
      schema: {
        response: {
          200: responseSchema(ticketSchema),
          404: errorSchema,
        },
        params: Type.Object({
          uuid: Type.String({ format: 'uuid' }),
        }),
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
