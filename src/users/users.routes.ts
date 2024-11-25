import { FastifyInstance } from 'fastify'
import { getUsers } from './users.service.js'

const usersRoutes = (fastify: FastifyInstance, _: object, done: () => void) => {
  fastify.get('/users', async (request, reply) => {
    const users = getUsers()
    reply.send(users)
  })

  done()
}

export default usersRoutes
