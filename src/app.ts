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
import ticketsRoutes from './tickets/tickets.routes.js'
import attachmentsRoutes from './attachments/attachments.routes.js'
import stripePlugin from './plugins/stripe.plugin.js'
import subscriptionsRoutes from './payments/subscriptions.routes.js'
import { request } from 'http'
import { transformResponse } from './utils/transformResponse.js'
import cors from '@fastify/cors'
import caslPlugin from './plugins/casl.js'

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

  fastify.register(fastifyCookie)
  fastify.register(fastifySession, {
    secret: process.env.SESSION_SECRET!,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_EXPIRATION_TIME,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    },
    saveUninitialized: false,
    cookieName: 'sessionId',
  })
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
  fastify.register(drizzlePlugin)
  fastify.register(authPlugin)
  fastify.register(fastifyMultipart)
  registerOauth2Provider(fastify)
  fastify.register(stripePlugin)
  fastify.register(cors, {
    origin: 'http://localhost:5173',
    credentials: true,
  })

  // routes
  fastify.register(usersRoutes)
  fastify.register(authRoutes)
  fastify.register(ticketsRoutes)
  fastify.register(attachmentsRoutes)
  fastify.register(subscriptionsRoutes)

  // decorators
  fastify.register(queuePlugin)
  fastify.register(caslPlugin)

  // fastify.addHook('onSend', (request, reply, payload, done) => {
  //   const transformedResponse = transformResponse(payload)
  //   console.log('transformedResponse', transformedResponse)
  //   done(null, transformedResponse)
  // })

  fastify.ready().then(() => {
    csvWorkerSetup(fastify)
  })

  return fastify
}

export default buildServer
