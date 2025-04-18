import * as fastify from 'fastify'
import * as http from 'http'
import { Transporter } from 'nodemailer'

import { type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '../database/schema.js'
import { OAuth2Namespace } from '@fastify/oauth2'
import { Queue } from 'bullmq'
import { TUserSchema } from '../users/schema/user.schema.js'

declare module 'fastify' {
  export interface FastifyInstance<
    HttpServer = http.Server,
    HttpRequest = http.IncomingMessage,
    HttpResponse = http.ServerResponse
  > {
    db: PostgresJsDatabase<typeof schema>
    csvQueue: Queue
    mailer: Transporter
    googleOAuth2: OAuth2Namespace
    isUserLoggedIn: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
    user: TUserSchema | null
    stripe: Stripe
  }
}
