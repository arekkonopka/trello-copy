import { FastifyInstance } from 'fastify'

const authRoutes = (fastify: FastifyInstance, _: object, done: () => void) => {
  fastify.post('/login', (request, reply) => {
    return request.session
  })

  done()
}

export default authRoutes
