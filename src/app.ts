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
import fastifyMultipart from '@fastify/multipart'
import queuePlugin from './plugins/queue.plugin.js'
import { csvWorkerSetup } from './workers/csv.worker.js'

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
  fastify.register(fastifyMultipart)
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
  fastify.register(queuePlugin)

  // routes
  fastify.register(usersRoutes)
  fastify.register(authRoutes)

  fastify.ready().then(() => {
    csvWorkerSetup(fastify)
  })

  return fastify
}

export default buildServer
