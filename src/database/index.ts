import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'

import * as schema from './schema.js'

const drizzlePlugin: FastifyPluginAsync = fp(async (app) => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set')
  }

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  })

  const db = drizzle({ client: pool, schema })
  app.decorate('db', db)

  app.addHook('onClose', async () => {
    await pool.end()
  })
})

export default drizzlePlugin
