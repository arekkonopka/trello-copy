import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { getJobById } from './processing.service'

const processingRoutes = (
  fastify: FastifyInstance,
  _: object,
  done: () => void
) => {
  fastify.get(
    '/processing/:jobId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { jobId } = request.params as { jobId: string }

      const result = await getJobById(fastify.db, jobId)

      reply.send(result)
    }
  )

  done()
}
