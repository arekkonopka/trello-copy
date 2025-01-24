import Fastify, { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import * as dotenv from 'dotenv'

import usersRoutes from './users/users.routes.js'
import drizzlePlugin from './database/index.js'
import sensible from '@fastify/sensible'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import { SESSION_EXPIRATION_TIME } from './config/constants.js'
import authRoutes from './auth/auth.routes.js'
import fastifyMailer from 'fastify-mailer'
import registerOauth2Provider from './auth/providers/oauth2.js'
import isUserLoggedIn from './auth/decorators/isUserLoggedIn.js'
import authPlugin from './auth/index.js'

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
  fastify.register(fastifyMailer, {
    defaults: { from: 'noreply@test.com' },
    transport: {
      host: 'sandbox.smtp.mailtrap.io',
      port: 2525,
      auth: {
        user: process.env.MAILER_USER,
        pass: process.env.MAILER_PASS,
      },
    },
  })
  fastify.register(fastifyCookie)
  fastify.register(drizzlePlugin)
  fastify.register(authPlugin)
  registerOauth2Provider(fastify)
  fastify.register(fastifySession, {
    secret: process.env.SESSION_SECRET!,
    cookie: {
      secure: 'auto',
      maxAge: SESSION_EXPIRATION_TIME,
    },
  })

  // decorators
  fastify.register(isUserLoggedIn)

  // routes
  fastify.register(usersRoutes)
  fastify.register(authRoutes)

  return fastify
}

export default buildServer
