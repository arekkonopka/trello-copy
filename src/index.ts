import Fastify from 'fastify'
import dotEnv from 'dotenv'

import usersRoutes from './users/users.routes.js'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'

const fastify = Fastify({
  logger: true,
}).withTypeProvider<TypeBoxTypeProvider>()

dotEnv.config()
fastify.register(usersRoutes)

// Declare a route
fastify.get('/', function (request, reply) {
  reply.send({ hello: 'world' })
})

// Run the server!
fastify.listen({ port: 3000 }, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})
