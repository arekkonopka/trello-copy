import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  vi,
} from 'vitest'
import buildServer from '../../app'
import request from 'supertest'
import { GenericContainer, StartedTestContainer } from 'testcontainers'

import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { sql } from 'drizzle-orm'
import { FastifyInstance } from 'fastify'
import { stringify } from 'querystring'
import logInUser from '../../database/helpers/loginUser'

describe('tickets', () => {
  let pgContainer: StartedTestContainer
  let fastify: FastifyInstance

  beforeAll(async () => {
    pgContainer = await new GenericContainer('postgres:16')
      .withExposedPorts(5432)
      .withEnvironment({
        POSTGRES_USER: 'test',
        POSTGRES_PASSWORD: 'test',
        POSTGRES_DB: 'test',
      })
      .start()

    const connectionString = `postgresql://test:test@${pgContainer.getHost()}:${pgContainer.getMappedPort(
      5432
    )}/test`

    process.env.DATABASE_URL = connectionString

    fastify = buildServer()
    await fastify.ready()

    await migrate(fastify.db, {
      migrationsFolder: './src/database/migrations',
    })
  })

  afterAll(async () => {
    await fastify.close()
    await pgContainer.stop()
  })

  afterEach(async () => {
    await fastify.db.execute(sql`TRUNCATE TABLE users CASCADE`)
    await fastify.db.execute(sql`TRUNCATE TABLE tickets CASCADE`)
  })

  describe('GET /tickets', () => {
    it('should return unauthorized', async () => {
      const response = await request(fastify.server).get('/tickets')

      expect(response.body).toEqual({
        error: 'Unauthorized',
        message: 'unauthorized',
        statusCode: 401,
      })
    })

    it('should return tickets', async () => {
      const { sessionCookie, userData } = await logInUser(fastify)

      await fastify.db.execute(sql`
        INSERT INTO tickets (title, description, creator_uuid)
        VALUES ('test title', 'test description', ${userData.uuid})
        `)

      const response = await request(fastify.server)
        .get('/tickets')
        .set('Cookie', sessionCookie)

      expect(response.body).toEqual([
        {
          created_at: expect.any(String),
          updated_at: expect.any(String),
          uuid: expect.any(String),
          title: expect.any(String),
          description: expect.any(String),
          user_uuid: null,
          creator_uuid: expect.any(String),
        },
      ])
    })
  })
})
