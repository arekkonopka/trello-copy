import * as fastify from 'fastify'
import * as http from 'http'

import { type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '../database/schema.js'

declare module 'fastify' {
  export interface FastifyInstance<
    HttpServer = http.Server,
    HttpRequest = http.IncomingMessage,
    HttpResponse = http.ServerResponse
  > {
    db: PostgresJsDatabase<typeof schema>
  }
}
