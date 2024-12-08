import Fastify, { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import * as dotenv from 'dotenv'

import usersRoutes from './users/users.routes.js'
import drizzlePlugin from './database/index.js'
import sensible from '@fastify/sensible'

// ASK: yarn start nie dziala, zle kompiuiluje utils...
dotenv.config()

const buildServer = (config = {}): FastifyInstance => {
  const opts = {
    ...config,
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
      },
    },
  }

  const fastify = Fastify(opts).withTypeProvider<TypeBoxTypeProvider>()

  fastify.register(sensible)
  fastify.register(drizzlePlugin)
  fastify.register(usersRoutes)

  return fastify
}

export default buildServer
