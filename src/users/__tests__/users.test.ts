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
import { GenericContainer, StartedTestContainer } from 'testcontainers'

import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { sql } from 'drizzle-orm'
import request from 'supertest'
import { FastifyInstance } from 'fastify'
import { createUsers } from '../../database/helpers/createUsers'
import { createUser } from '../../database/helpers/createUser'
import logInUser from '../../database/helpers/loginUser'
import * as emailService from '../../email/email.service'

describe('users', () => {
  let container: StartedTestContainer
  let fastify: FastifyInstance

  beforeAll(async () => {
    // ASK: W jaki sposob mockuje sie takie rzeczy jak email?
    // Jak wyglada obsluga email? Czy smtp bierze sie np z MailTrap?
    vi.spyOn(emailService, 'sendEmail').mockImplementation(() =>
      Promise.resolve()
    )

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
    await fastify.db.execute(sql`TRUNCATE TABLE session CASCADE`)
  })

  describe('/GET users', () => {
    it('should return unauthorized', async () => {
      const response = await request(fastify.server).get('/users')

      expect(response.body).toEqual({
        error: 'Unauthorized',
        message: 'unauthorized',
        statusCode: 401,
      })
    })

    it('should return 200', async () => {
      const { sessionCookie } = await logInUser(fastify)

      const response = await request(fastify.server)
        .get('/users')
        .set('Cookie', sessionCookie)

      expect(response.statusCode).toBe(200)
      expect(response.body).toHaveLength(1)
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            uuid: expect.any(String),
            first_name: expect.any(String),
            last_name: expect.any(String),
            email: expect.any(String),
            avatar_url: null,
            created_at: expect.any(String),
            updated_at: expect.any(String),
          }),
        ])
      )
    })

    // search
    it('should return empty array when no user is found with provided search', async () => {
      const { sessionCookie } = await logInUser(fastify)

      const response = await request(fastify.server)
        .get('/users?search=emptyArrayUser')
        .set('Cookie', sessionCookie)

      expect(response.statusCode).toBe(200)
      expect(response.body).toEqual([])
    })

    it('should return array of users when first_name match search param', async () => {
      const { sessionCookie } = await logInUser(fastify)

      const response = await request(fastify.server)
        .get('/users?search=john')
        .set('Cookie', sessionCookie)

      expect(response.statusCode).toBe(200)
      expect(response.body).toEqual([
        {
          uuid: expect.any(String),
          first_name: 'John',
          last_name: 'Doe',
          email: expect.any(String),
          created_at: expect.any(String),
          updated_at: expect.any(String),
          avatar_url: null,
        },
      ])
    })

    // pagination
    it('should return 400 when limit is provided but offset is not', async () => {
      const { sessionCookie } = await logInUser(fastify)

      const response = await request(fastify.server)
        .get('/users?limit=10')
        .set('Cookie', sessionCookie)

      expect(response.statusCode).toBe(400)
      expect(response.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Offset and limit are required when both are set',
      })
    })

    it('should return 400 when offset is provided but limit is not', async () => {
      const { sessionCookie } = await logInUser(fastify)

      const response = await request(fastify.server)
        .get('/users?offset=1')
        .set('Cookie', sessionCookie)

      expect(response.statusCode).toBe(400)
      expect(response.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Offset and limit are required when both are set',
      })
    })

    it('should return a correct subset of users based on limit and offset', async () => {
      await createUsers(fastify.db, 10)

      const { sessionCookie } = await logInUser(fastify)

      const response = await request(fastify.server)
        .get('/users?limit=5&offset=1')
        .set('Cookie', sessionCookie)

      expect(response.statusCode).toBe(200)
      expect(response.body).toHaveLength(5)

      const firstUserFromFirstPage = response.body[0]

      const response2 = await request(fastify.server)
        .get('/users?limit=5&offset=2')
        .set('Cookie', sessionCookie)

      expect(response.statusCode).toBe(200)
      expect(response.body).toHaveLength(5)

      const firstUserFromSecondPage = response2.body[0]

      expect(firstUserFromFirstPage.uuid).not.toEqual(
        firstUserFromSecondPage.uuid
      )
    })

    // order_by
    it('should return users in ascending order by default', async () => {
      await createUsers(fastify.db, 2, [
        {
          first_name: 'Mary',
          last_name: 'Boe',
        },
        {
          first_name: 'Alice',
          last_name: 'Smith',
        },
      ])

      const { sessionCookie } = await logInUser(fastify)

      const response = await request(fastify.server)
        .get('/users?order_by=ASC')
        .set('Cookie', sessionCookie)

      expect(response.statusCode).toBe(200)
      expect(response.body).toEqual([
        {
          uuid: expect.any(String),
          first_name: 'Alice',
          last_name: 'Smith',
          email: expect.any(String),
          created_at: expect.any(String),
          updated_at: expect.any(String),
          avatar_url: expect.any(String),
        },
        {
          uuid: expect.any(String),
          first_name: 'John',
          last_name: 'Doe',
          email: expect.any(String),
          created_at: expect.any(String),
          updated_at: expect.any(String),
          avatar_url: null,
        },
        {
          uuid: expect.any(String),
          first_name: 'Mary',
          last_name: 'Boe',
          email: expect.any(String),
          created_at: expect.any(String),
          updated_at: expect.any(String),
          avatar_url: expect.any(String),
        },
      ])
    })

    it('should return users in descending order', async () => {
      await createUsers(fastify.db, 2, [
        {
          first_name: 'Mary',
          last_name: 'Boe',
        },
        {
          first_name: 'Alice',
          last_name: 'Smith',
        },
      ])

      const { sessionCookie } = await logInUser(fastify)

      const response = await request(fastify.server)
        .get('/users?order_by=DESC')
        .set('Cookie', sessionCookie)

      expect(response.statusCode).toBe(200)
      expect(response.body).toEqual([
        {
          uuid: expect.any(String),
          first_name: 'Mary',
          last_name: 'Boe',
          email: expect.any(String),
          created_at: expect.any(String),
          updated_at: expect.any(String),
          avatar_url: expect.any(String),
        },
        {
          uuid: expect.any(String),
          first_name: 'John',
          last_name: 'Doe',
          email: expect.any(String),
          created_at: expect.any(String),
          updated_at: expect.any(String),
          avatar_url: null,
        },
        {
          uuid: expect.any(String),
          first_name: 'Alice',
          last_name: 'Smith',
          email: expect.any(String),
          created_at: expect.any(String),
          updated_at: expect.any(String),
          avatar_url: expect.any(String),
        },
      ])
    })
  })

  describe('/GET users/:uuid', () => {
    it('should return unauthorized', async () => {
      const response = await request(fastify.server).get(
        '/users/0e4adf5a-fcbb-4034-ac21-a15a761705ec'
      )

      expect(response.body).toEqual({
        error: 'Unauthorized',
        message: 'unauthorized',
        statusCode: 401,
      })
    })

    it('should return 404 when user not found', async () => {
      const { sessionCookie } = await logInUser(fastify)

      const response = await request(fastify.server)
        .get('/users/0e4adf5a-fcbb-4034-ac21-a15a761705ec')
        .set('Cookie', sessionCookie)

      expect(response.statusCode).toBe(404)
      expect(response.body).toEqual({
        error: 'Not Found',
        message: 'User not found',
        statusCode: 404,
      })
    })

    it('should return user', async () => {
      const { userCredentials, sessionCookie } = await logInUser(fastify)

      const response = await request(fastify.server)
        .get(`/users/${userCredentials.user_uuid}`)
        .set('Cookie', sessionCookie)

      expect(response.statusCode).toBe(200)
      expect(response.body).toEqual([
        {
          uuid: userCredentials.user_uuid,
          first_name: 'John',
          last_name: 'Doe',
          email: expect.any(String),
          created_at: expect.any(String),
          updated_at: expect.any(String),
          avatar_url: null,
        },
      ])
    })
  })

  describe('/POST', () => {
    it('should return unauthorized', async () => {
      const response = await request(fastify.server).post('/users').send({
        first_name: 'John',
        last_name: 'Doe',
        email: 'John@Doe.com',
      })

      expect(response.body).toEqual({
        error: 'Unauthorized',
        message: 'unauthorized',
        statusCode: 401,
      })
    })

    it('should return 400 when user already exists', async () => {
      const { sessionCookie, userData } = await logInUser(fastify)

      const response = await request(fastify.server)
        .post('/users')
        .send({
          first_name: userData.first_name,
          last_name: userData.last_name,
          email: userData.email,
        })
        .set('Cookie', sessionCookie)

      expect(response.statusCode).toBe(400)
      expect(response.body).toEqual({
        error: 'Bad Request',
        message: 'User already exists',
        statusCode: 400,
      })
    })

    it('should create user', async () => {
      const { sessionCookie } = await logInUser(fastify)

      const response = await request(fastify.server)
        .post('/users')
        .send({
          first_name: 'Jane',
          last_name: 'Doe',
          email: 'Jane@Doe.com',
        })
        .set('Cookie', sessionCookie)

      expect(response.statusCode).toBe(200)
      expect(response.body).toEqual({
        uuid: expect.any(String),
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'Jane@Doe.com',
        created_at: expect.any(String),
        updated_at: expect.any(String),
        avatar_url: null,
      })
    })
  })

  describe('/PATCH', () => {
    it('should return unauthorized', async () => {
      const response = await request(fastify.server)
        .patch('/users/0e4adf5a-fcbb-4034-ac21-a15a761705ec')
        .send({})

      expect(response.body).toEqual({
        error: 'Unauthorized',
        message: 'unauthorized',
        statusCode: 401,
      })
    })

    it('should return 404 when user not found', async () => {
      const { sessionCookie } = await logInUser(fastify)

      const response = await request(fastify.server)
        .patch('/users/0e4adf5a-fcbb-4034-ac21-a15a761705ec')
        .send({})
        .set('Cookie', sessionCookie)

      expect(response.statusCode).toBe(404)
      expect(response.body).toEqual({
        error: 'Not Found',
        message: 'User not found',
        statusCode: 404,
      })
    })

    it('should update user', async () => {
      const { userCredentials, sessionCookie } = await logInUser(fastify)

      const response = await request(fastify.server)
        .patch(`/users/${userCredentials.user_uuid}`)
        .send({
          first_name: 'new first name',
          last_name: 'new last name',
          email: 'newEmail@gmail.com',
        })
        .set('Cookie', sessionCookie)

      expect(response.statusCode).toBe(200)
      expect(response.body).toEqual([
        {
          uuid: expect.any(String),
          first_name: 'new first name',
          last_name: 'new last name',
          email: 'newEmail@gmail.com',
          created_at: expect.any(String),
          updated_at: expect.any(String),
          avatar_url: null,
        },
      ])
    })
  })

  describe('/DELETE', () => {
    it('should return unauthorized', async () => {
      const response = await request(fastify.server)
        .patch('/users/0e4adf5a-fcbb-4034-ac21-a15a761705ec')
        .send({})

      expect(response.body).toEqual({
        error: 'Unauthorized',
        message: 'unauthorized',
        statusCode: 401,
      })
    })

    it('should return 404 when userNotFound', async () => {
      const { sessionCookie } = await logInUser(fastify)

      const response = await request(fastify.server)
        .delete('/users/0e4adf5a-fcbb-4034-ac21-a15a761705ec')
        .set('Cookie', sessionCookie)

      expect(response.statusCode).toBe(404)
      expect(response.body).toEqual({
        error: 'Not Found',
        message: 'User not found',
        statusCode: 404,
      })
    })

    it('should delete user', async () => {
      const { sessionCookie } = await logInUser(fastify)

      await createUser(fastify.db, {
        uuid: '0e4adf5a-fcbb-4034-ac21-a15a761705ec',
      })

      const response = await request(fastify.server)
        .delete('/users/0e4adf5a-fcbb-4034-ac21-a15a761705ec')
        .set('Cookie', sessionCookie)

      expect(response.statusCode).toBe(200)
      expect(response.body).toEqual({
        message: 'User 0e4adf5a-fcbb-4034-ac21-a15a761705ec deleted',
      })
    })
  })
})
