import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import buildServer from '../../app'
import { GenericContainer, StartedTestContainer } from 'testcontainers'

import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { sql } from 'drizzle-orm'
import request from 'supertest'
import { FastifyInstance } from 'fastify'
import { createUser } from '../../database/helpers/createUser'

describe('auth', () => {
  let container: StartedTestContainer
  let fastify: FastifyInstance

  beforeAll(async () => {
    container = await new GenericContainer('postgres:16')
      .withExposedPorts(5432)
      .withEnvironment({
        POSTGRES_USER: 'test',
        POSTGRES_PASSWORD: 'test',
        POSTGRES_DB: 'test',
      })
      .start()

    const connectionString = `postgresql://test:test@${container.getHost()}:${container.getMappedPort(
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
    await container.stop()
  })

  afterEach(async () => {
    await fastify.db.execute(sql`TRUNCATE TABLE users CASCADE`)
    await fastify.db.execute(sql`TRUNCATE TABLE auth CASCADE`)
  })

  describe('/login', () => {
    it('should return 400 user not found', async () => {
      const response = await request(fastify.server).post('/login').send({
        email: 'email@test.com',
        password: '1234',
      })

      expect(response.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'User not found',
      })
    })

    it('should return 401 invalid credentials', async () => {
      // register new user
      const user = {
        email: 'user@test.com',
        password: '1234',
        first_name: 'John',
        last_name: 'Doe',
      }

      await request(fastify.server).post('/register').send(user)

      const response = await request(fastify.server).post('/login').send({
        email: user.email,
        password: 'wrongpassword',
      })

      expect(response.body).toEqual({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid credentials',
      })
    })

    it('should return 400 user credentials not found', async () => {
      const user = {
        email: 'user@test.com',
        password: '1234',
      }

      await createUser(fastify.db, {
        email: user.email,
      })

      const response = await request(fastify.server).post('/login').send({
        email: user.email,
        password: user.password,
      })

      expect(response.statusCode).toBe(400)
      expect(response.body).toEqual({
        error: 'Bad Request',
        message: 'User credentials not found',
        statusCode: 400,
      })
    })

    it('should login user', async () => {
      const user = {
        email: 'user@test.com',
        password: '1234',
        first_name: 'John',
        last_name: 'Doe',
      }

      const registerResponse = await request(fastify.server)
        .post('/register')
        .send(user)
      const registeredUser = registerResponse.body[0]

      const response = await request(fastify.server).post('/login').send({
        email: user.email,
        password: user.password,
      })

      expect(response.body).toEqual({ message: 'User successfully logged in' })

      const { rows } = await fastify.db.execute(sql`
        SELECT * FROM auth 
        WHERE user_uuid = ${registeredUser.uuid}
        `)

      expect(rows).toHaveLength(1)
      expect(rows[0]).toEqual({
        created_at: expect.any(String),
        user_uuid: registeredUser.uuid,
        expires_at: expect.any(String),
        uuid: expect.any(String),
        session_id: expect.any(String),
        password: expect.any(String),
      })
    })
  })

  describe('/register', () => {
    it('should return 400 when user exists', async () => {
      const user = {
        email: 'user@test.com',
        password: '1234',
        first_name: 'John',
        last_name: 'Doe',
      }

      await createUser(fastify.db, {
        email: user.email,
      })

      const response = await request(fastify.server)
        .post('/register')
        .send(user)

      expect(response.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'User already exist',
      })
    })

    it('should return 200 and create user', async () => {
      const user = {
        email: 'user@test.com',
        password: '1234',
        first_name: 'John',
        last_name: 'Doe',
      }
      const { password, ...userWithoutPassword } = user

      const response = await request(fastify.server)
        .post('/register')
        .send(user)

      expect(response.statusCode).toBe(200)
      expect(response.body[0]).toEqual({
        ...response.body[0],
        ...userWithoutPassword,
      })

      const { rows } = await fastify.db.execute(sql`
        SELECT * FROM auth
        WHERE user_uuid = ${response.body[0].uuid}
        `)

      expect(rows).toHaveLength(1)
    })
  })
})
