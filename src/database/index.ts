import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { Pool } from 'pg'

import * as schema from './schema.js'

declare module 'fastify' {
  interface FastifyInstance {
    db: PostgresJsDatabase<typeof schema>
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
const db = drizzle({ client: pool, schema })

const drizzlePlugin: FastifyPluginAsync = fp(async (app) => {
  app.decorate('db', db)

  app.addHook('onClose', async () => {
    await pool.end()
  })
})

export default drizzlePlugin
