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
        otp: expect.any(String),
        is_email_verified: expect.any(Boolean),
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

  describe('otp', () => {
    it('should return 404 user not found', async () => {
      const response = await request(fastify.server).post('/verify-otp').send({
        email: 'email@test.com',
        otp: '123456',
      })

      expect(response.body).toEqual({
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
      })
    })

    it('should return 400 when otp not found', async () => {
      const user = {
        email: 'user@test.com',
        password: '1234',
        first_name: 'John',
        last_name: 'Doe',
      }

      const responseRegister = await request(fastify.server)
        .post('/register')
        .send(user)

      await fastify.db.execute(`
        UPDATE auth 
        SET otp = null
        WHERE user_uuid = '${responseRegister.body[0].uuid}'
        `)

      const responseOtp = await request(fastify.server)
        .post('/verify-otp')
        .send({
          email: responseRegister.body[0].email,
          otp: '123456',
        })

      expect(responseOtp.body).toEqual({
        statusCode: 404,
        error: 'Not Found',
        message: 'Otp not found',
      })
    })

    it('should return 422 when incorrect OTP', async () => {
      const user = {
        email: 'user@test.com',
        password: '1234',
        first_name: 'John',
        last_name: 'Doe',
      }

      const responseRegister = await request(fastify.server)
        .post('/register')
        .send(user)

      const responseOtp = await request(fastify.server)
        .post('/verify-otp')
        .send({
          email: responseRegister.body[0].email,
          otp: '123456',
        })

      expect(responseOtp.body).toEqual({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: 'Incorrect Otp',
      })
    })

    it('should return an error when OTP format is invalid', async () => {
      const user = {
        email: 'user@test.com',
        password: '1234',
        first_name: 'John',
        last_name: 'Doe',
      }

      const responseRegister = await request(fastify.server)
        .post('/register')
        .send(user)

      const userEmail = responseRegister.body[0].email
      const userUuid = responseRegister.body[0].uuid

      const responseOtp = await request(fastify.server)
        .post('/verify-otp')
        .send({
          email: userEmail,
          otp: 111,
        })

      expect(responseOtp.body).toEqual({
        code: 'FST_ERR_VALIDATION',
        error: 'Bad Request',
        message: 'body/otp must match pattern "^[0-9]{6}$"',
        statusCode: 400,
      })
    })

    it('should return 200 when otp is verified', async () => {
      const user = {
        email: 'user@test.com',
        password: '1234',
        first_name: 'John',
        last_name: 'Doe',
      }

      const responseRegister = await request(fastify.server)
        .post('/register')
        .send(user)

      const userEmail = responseRegister.body[0].email
      const userUuid = responseRegister.body[0].uuid

      const otpQuery = await fastify.db.execute(sql`
        SELECT otp FROM auth WHERE user_uuid = ${userUuid}
      `)

      const otp = otpQuery.rows[0]?.otp

      const responseOtp = await request(fastify.server)
        .post('/verify-otp')
        .send({
          email: userEmail,
          otp,
        })

      expect(responseOtp.statusCode).toBe(200)

      const verificationQuery = await fastify.db.execute(sql`
          SELECT is_email_verified 
          FROM auth
          WHERE user_uuid = ${userUuid}
        `)

      const isEmailVerified = verificationQuery.rows[0]?.is_email_verified
      expect(isEmailVerified).toBe(true)
    })
  })
})
