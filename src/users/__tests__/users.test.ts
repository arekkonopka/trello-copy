import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  vi,
  beforeEach,
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
import fs from 'fs'
import path from 'path'
import { EOL } from 'os'
import { seedRolesAndPermissions } from '../../database/seeds/rolesAndPermissions'
import { updateRole } from '../../database/helpers/createRole'
import { TUserSchema } from '../schema/user.schema'

describe('users', () => {
  let pgContainer: StartedTestContainer
  let redisContainer: StartedTestContainer
  let fastify: FastifyInstance

  let sessionCookie: string
  let userData: TUserSchema
  let userCredentials: any

  beforeAll(async () => {
    vi.spyOn(emailService, 'sendEmail').mockImplementation(() =>
      Promise.resolve()
    )

    redisContainer = await new GenericContainer('redis:7')
      .withExposedPorts(6379)
      .start()

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
    await redisContainer.stop()
  })

  beforeEach(async () => {
    await seedRolesAndPermissions(fastify.db)

    const loginResult = await logInUser(fastify)
    sessionCookie = loginResult.sessionCookie
    userData = loginResult.userData
    userCredentials = loginResult.userCredentials
  })

  afterEach(async () => {
    await fastify.db.execute(sql`TRUNCATE TABLE users CASCADE`)
    await fastify.db.execute(sql`TRUNCATE TABLE session CASCADE`)
    await fastify.db.execute(sql`TRUNCATE TABLE jobs CASCADE`)
    await fastify.db.execute(sql`TRUNCATE TABLE roles CASCADE`)
    await fastify.db.execute(sql`TRUNCATE TABLE user_roles CASCADE`)
    await fastify.db.execute(sql`TRUNCATE TABLE permissions CASCADE`)
    await fastify.db.execute(sql`TRUNCATE TABLE role_permissions CASCADE`)
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
      const response = await request(fastify.server)
        .get('/users?search=emptyArrayUser')
        .set('Cookie', sessionCookie)

      expect(response.statusCode).toBe(200)
      expect(response.body).toEqual([])
    })

    it('should return array of users when first_name match search param', async () => {
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

    describe.skip('OLD csv upload without queue', () => {
      it('test', async () => {
        const csv = [
          'first_name,last_name,email,avatar_url',
          'John,Doe,john.doe@example.com,https://example.com/avatar1.jpg',
          'Jane,Smith,jane.smith@example.com,https://example.com/avatar2.jpg',
        ].join(EOL)

        const filePath = path.resolve(__dirname, 'csv.csv')
        // create file
        await fs.promises.writeFile(filePath, csv)

        const response = await request(fastify.server)
          .post('/users/csv-upload')
          .attach('file', filePath)

        const jobs = await fastify.db.execute(sql`
          SELECT * FROM jobs
          `)
        // expect(response.body).toBe('ok')
      })

      it('should return "Invalid file type. Only CSV files are allowed."', async () => {
        const response = await request(fastify.server)
          .post('/users/csv-upload')
          .attach('file', Buffer.from('dummy'), 'test.pdf')

        expect(response.body).toEqual({
          error: 'Unsupported Media Type',
          message: 'Invalid file type. Only CSV files are allowed.',
          statusCode: 415,
        })
      })

      it('should return "Invalid headers" because header is missing', async () => {
        const invalidCSV = [
          'first_name,last_name,avatar_url,',
          'John,Doe,john.doe@example.com,https://example.com/avatar1.jpg',
        ].join(EOL)

        const filePath = path.resolve(__dirname, 'invalid.csv')

        // create file
        await fs.promises.writeFile(filePath, invalidCSV)

        const response = await request(fastify.server)
          .post('/users/csv-upload')
          .attach('file', filePath)

        expect(response.body).toEqual({
          error: 'Bad Request',
          message: 'Invalid headers',
          statusCode: 400,
        })

        // remove file
        await fs.promises.unlink(filePath)
      })

      it('should return "Invalid headers", because incorrect header name', async () => {
        const invalidCSV = [
          'first_name,last_nam,email,avatar_url',
          'John,Doe,john.doe@example.com,https://example.com/avatar1.jpg',
        ].join(EOL)

        const filePath = path.resolve(__dirname, 'invalid.csv')

        // create file
        await fs.promises.writeFile(filePath, invalidCSV)

        const response = await request(fastify.server)
          .post('/users/csv-upload')
          .attach('file', filePath)

        expect(response.body).toEqual({
          error: 'Bad Request',
          message: 'Invalid headers',
          statusCode: 400,
        })

        // remove file
        await fs.promises.unlink(filePath)
      })

      it('should return missing values', async () => {
        const invalidCSV = [
          'first_name,last_name,email,avatar_url',
          ',Doe,john.doe@example.com,https://example.com/avatar1.jpg,2024-01-01T12:00:00Z,2024-01-01T12:00:00Z',
          'Jane,Smith,jane.smithexample.com,https://example.com/avatar2.jpg,2024-01-02T15:30:00Z,2024-01-02T15:30:00Z',
        ].join(EOL)

        const filePath = path.resolve(__dirname, 'invalid.csv')

        // create file
        await fs.promises.writeFile(filePath, invalidCSV)

        const response = await request(fastify.server)
          .post('/users/csv-upload')
          .attach('file', filePath)

        expect(response.body).toEqual({
          statusCode: 400,
          error: 'Bad Request',
          message: `["Row 1: Field 'first_name' must be string.","Row 2: Field 'email' must match format \\"email\\"."]`,
        })

        // remove file
        await fs.promises.unlink(filePath)
      })

      it('should return "Invalid headers" when extra column added', async () => {
        const invalidCSV = [
          'first_name,last_name,email,avatar_url,extra column',
          'John,Doe,john.doe@example.com,https://example.com/avatar1.jpg,2024-01-01T12:00:00Z,2024-01-01T12:00:00Z',
        ].join(EOL)

        const filePath = path.resolve(__dirname, 'invalid.csv')

        // create file
        await fs.promises.writeFile(filePath, invalidCSV)

        const response = await request(fastify.server)
          .post('/users/csv-upload')
          .attach('file', filePath)

        expect(response.body).toEqual({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid headers',
        })

        // remove file
        await fs.promises.unlink(filePath)
      })

      it('should return "Too many fields" error', async () => {
        const invalidCSV = [
          'first_name,last_name,email,avatar_url',
          'John,Doe,john.doe@example.com,https://example.com/avatar1.jpg,2024-01-01T12:00:00Z,2024-01-01T12:00:00Z',
          'Jane,Smith,jane.smith@example.com,https://example.com/avatar2.jpg,2024-01-02T15:30:00Z,2024-01-02T15:30:00Z',
        ].join(EOL)

        const filePath = path.resolve(__dirname, 'invalid.csv')

        // create file
        await fs.promises.writeFile(filePath, invalidCSV)

        const response = await request(fastify.server)
          .post('/users/csv-upload')
          .attach('file', filePath)

        expect(response.body).toEqual({
          statusCode: 400,
          error: 'Bad Request',
          message: `["Row: 0 has Too many fields: expected 4 fields but parsed 6","Row: 1 has Too many fields: expected 4 fields but parsed 6"]`,
        })

        // remove file
        await fs.promises.unlink(filePath)
      })

      it('should upload csv', async () => {
        const csv = [
          'first_name,last_name,email,avatar_url',
          'John,Doe,john.doe@example.com,https://example.com/avatar1.jpg',
          'Jane,Smith,jane.smith@example.com,https://example.com/avatar2.jpg',
        ].join(EOL)

        const filePath = path.resolve(__dirname, 'invalid.csv')

        // create file
        await fs.promises.writeFile(filePath, csv)

        const response = await request(fastify.server)
          .post('/users/csv-upload')
          .attach('file', filePath)

        expect(response.body).toHaveLength(2)

        // first user
        expect(response.body[0]).toHaveProperty('created_at')
        expect(response.body[0]).toHaveProperty('updated_at')
        expect(response.body[0]).toHaveProperty('uuid')
        expect(response.body[0]).toHaveProperty('first_name', 'John')
        expect(response.body[0]).toHaveProperty('last_name', 'Doe')
        expect(response.body[0]).toHaveProperty('email', 'john.doe@example.com')
        expect(response.body[0]).toHaveProperty(
          'avatar_url',
          'https://example.com/avatar1.jpg'
        )

        // second user
        expect(response.body[1]).toHaveProperty('created_at')
        expect(response.body[1]).toHaveProperty('updated_at')
        expect(response.body[1]).toHaveProperty('uuid')
        expect(response.body[1]).toHaveProperty('first_name', 'Jane')
        expect(response.body[1]).toHaveProperty('last_name', 'Smith')
        expect(response.body[1]).toHaveProperty(
          'email',
          'jane.smith@example.com'
        )
        expect(response.body[1]).toHaveProperty(
          'avatar_url',
          'https://example.com/avatar2.jpg'
        )

        // remove file
        await fs.promises.unlink(filePath)
      })

      it('should upload csv without optional field', async () => {
        const csv = [
          'first_name,last_name,email,avatar_url',
          'John,Doe,john.doe@example.com,',
        ].join(EOL)

        const filePath = path.resolve(__dirname, 'invalid.csv')

        // create file
        await fs.promises.writeFile(filePath, csv)

        const response = await request(fastify.server)
          .post('/users/csv-upload')
          .attach('file', filePath)

        expect(response.body).toHaveLength(1)

        expect(response.body[0]).toHaveProperty('created_at')
        expect(response.body[0]).toHaveProperty('updated_at')
        expect(response.body[0]).toHaveProperty('uuid')
        expect(response.body[0]).toHaveProperty('first_name', 'John')
        expect(response.body[0]).toHaveProperty('last_name', 'Doe')
        expect(response.body[0]).toHaveProperty('email', 'john.doe@example.com')
        expect(response.body[0]).toHaveProperty('avatar_url', null)

        // remove file
        await fs.promises.unlink(filePath)
      })
    })
  })

  describe('/POST csv upload', () => {
    it('should return "Invalid file type. Only CSV files are allowed."', async () => {
      const response = await request(fastify.server)
        .post('/users/csv-upload')
        .attach('file', Buffer.from('dummy'), 'test.pdf')
        .set('Cookie', sessionCookie)

      expect(response.body).toEqual({
        error: 'Unsupported Media Type',
        message: 'Invalid file type. Only CSV files are allowed.',
        statusCode: 415,
      })
    })

    it('should return "Invalid headers" because header is missing', async () => {
      // const user = await fastify.db.execute(sql`SELECT * FROM users`)

      // console.log('user', user.rows)

      // const auth = await fastify.db.execute(sql`SELECT * FROM auth`)

      // console.log('auth', auth.rows)

      const invalidCSV = [
        'first_name,last_name,avatar_url,',
        'John,Doe,john.doe@example.com,https://example.com/avatar1.jpg',
      ].join(EOL)

      const filePath = path.resolve(__dirname, 'invalid.csv')

      // create file
      await fs.promises.writeFile(filePath, invalidCSV)

      const response = await request(fastify.server)
        .post('/users/csv-upload')
        .attach('file', filePath)
        .set('Cookie', sessionCookie)

      expect(response.body).toEqual({
        message: 'CSV file uploaded',
        meta: {
          jobId: expect.any(String),
        },
        statusCode: 202,
      })

      const jobId = response.body.meta.jobId

      const jobs = await fastify.db.execute(sql`
        SELECT * FROM jobs
        `)

      console.log('jobId', jobId)

      console.log('jobs', jobs.rows)

      // remove file
      await fs.promises.unlink(filePath)
    })

    it('test', async () => {
      const csv = [
        'first_name,last_name,email,avatar_url',
        'John,Doe,john.doe@example.com,https://example.com/avatar1.jpg',
        'Jane,Smith,jane.smith@example.com,https://example.com/avatar2.jpg',
      ].join(EOL)

      const filePath = path.resolve(__dirname, 'csv.csv')
      // create file
      await fs.promises.writeFile(filePath, csv)

      const response = await request(fastify.server)
        .post('/users/csv-upload')
        .attach('file', filePath)

      const jobs = await fastify.db.execute(sql`
        SELECT * FROM jobs
        `)
      // expect(response.body).toBe('ok')
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
      await updateRole(fastify.db, 'admin', userData.uuid)

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

    it('should return 403 when user is not admin', async () => {
      await updateRole(fastify.db, 'user', userData.uuid)

      const response = await request(fastify.server)
        .delete('/users/0e4adf5a-fcbb-4034-ac21-a15a761705ec')
        .set('Cookie', sessionCookie)

      expect(response.statusCode).toBe(403)
      expect(response.body).toEqual({
        error: 'Forbidden',
        message: "You don't have permission to delete user",
        statusCode: 403,
      })
    })

    it('should delete user', async () => {
      await updateRole(fastify.db, 'admin', userData.uuid)

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
