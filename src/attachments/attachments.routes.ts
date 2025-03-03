import { FastifyInstance } from 'fastify'
import {
  deleteAttachmentsHandler,
  postAttachmentsHandler,
} from './attachments.service'
import { responseSchema } from '../schema/response.schema'
import { attachmentsSchema } from './schema/attachments.schema'
import { transformResponse } from '../utils/transformResponse'
import { errorSchema } from '../users/schema/error.schema'

const attachmentsRoutes = (
  fastify: FastifyInstance,
  _: object,
  done: () => void
) => {
  fastify.post(
    '/attachments',
    {
      schema: {
        response: {
          201: responseSchema(attachmentsSchema),
          404: errorSchema,
        },
      },
      preHandler: fastify.auth([fastify.isUserLoggedIn]),
    },
    async (request, reply) => {
      const response = await postAttachmentsHandler(fastify, request)
      const transformedResponse = transformResponse(response)
      reply.send(transformedResponse)
    }
  )

  fastify.delete(
    '/attachments/:uuid',
    {
      schema: {
        response: {
          200: responseSchema(attachmentsSchema),
          404: errorSchema,
        },
      },
      preHandler: fastify.auth([fastify.isUserLoggedIn]),
    },
    async (request, reply) => {
      const response = await deleteAttachmentsHandler(fastify, request)
      const transformedResponse = transformResponse(response)

      reply.send(transformedResponse)
    }
  )

  done()
}

export default attachmentsRoutes
