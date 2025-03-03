import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  vi,
} from 'vitest'
import request from 'supertest'
import { GenericContainer, StartedTestContainer } from 'testcontainers'
import { FastifyInstance } from 'fastify'
import * as emailService from '../../email/email.service'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { sql } from 'drizzle-orm'
import buildServer from '../../app'
import logInUser from '../../database/helpers/loginUser'
import fs from 'fs'
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { mockClient } from 'aws-sdk-client-mock'

vi.mock('@aws-sdk/client-s3')

describe('attachments', () => {
  let pgContainer: StartedTestContainer
  let fastify: FastifyInstance
  const s3Mock = mockClient(S3Client)

  beforeAll(async () => {
    vi.spyOn(emailService, 'sendEmail').mockImplementation(() =>
      Promise.resolve()
    )

    s3Mock.on(PutObjectCommand).resolves({})
    s3Mock.on(DeleteObjectCommand).resolves({})

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
    s3Mock.reset()
  })

  afterEach(async () => {
    await fastify.db.execute(sql`TRUNCATE TABLE users CASCADE`)
    await fastify.db.execute(sql`TRUNCATE TABLE tickets CASCADE`)
    await fastify.db.execute(sql`TRUNCATE TABLE attachments CASCADE`)
  })

  describe('POST /attachments', () => {
    it('should return unauthorized', async () => {
      const response = await request(fastify.server).post('/attachments').send({
        ticket_uuid: '0e4adf5a-fcbb-4034-ac21-a15a761705ec',
      })

      expect(response.body).toEqual({
        error: 'Unauthorized',
        message: 'unauthorized',
        statusCode: 401,
      })
    })

    it('should return 404 when ticket not found', async () => {
      const { sessionCookie } = await logInUser(fastify)

      const dumbFile = Buffer.from('test')

      const response = await request(fastify.server)
        .post('/attachments?ticket_uuid=0e4adf5a-fcbb-4034-ac21-a15a761705ec')
        .set('Cookie', sessionCookie)
        .attach('dumbFile', dumbFile)

      expect(response.statusCode).toBe(404)
      expect(response.body).toEqual({
        error: 'Not Found',
        message: 'Ticket not found',
        statusCode: 404,
      })
    })

    it('should upload file to s3', async () => {
      const { sessionCookie, userData } = await logInUser(fastify)

      const createdTicket = await fastify.db.execute(sql`
        INSERT INTO tickets (title, description, creator_uuid)
        VALUES ('test title', 'test description', ${userData.uuid})
        RETURNING *
      `)

      const ticket_uuid = createdTicket.rows[0].uuid

      const dumbFile = Buffer.from('test')

      const response = await request(fastify.server)
        .post(`/attachments?ticket_uuid=${ticket_uuid}`)
        .set('Cookie', sessionCookie)
        .attach('dumbFile', dumbFile, { filename: 'dumbFile' })

      expect(s3Mock.calls()).toHaveLength(1)

      expect(response.body).toEqual({
        data: [
          {
            created_at: expect.any(String),
            updated_at: expect.any(String),
            file_name: 'dumbFile',
            file_type: 'application/octet-stream',
            file_size: null,
            ticket_uuid: ticket_uuid,
            url: expect.any(String),
            uuid: expect.any(String),
          },
        ],
      })
    })
  })
  describe('DELETE /attachments/:uuid', () => {
    it('should return unauthorized', async () => {
      const response = await request(fastify.server).delete(
        '/attachments/0e4adf5a-fcbb-4034-ac21-a15a761705ec'
      )

      expect(response.body).toEqual({
        error: 'Unauthorized',
        message: 'unauthorized',
        statusCode: 401,
      })
    })

    it('should return 404 when attachment not found', async () => {
      const { sessionCookie } = await logInUser(fastify)

      const response = await request(fastify.server)
        .delete('/attachments/0e4adf5a-fcbb-4034-ac21-a15a761705ec')
        .set('Cookie', sessionCookie)

      expect(response.statusCode).toBe(404)
      expect(response.body).toEqual({
        error: 'Not Found',
        message: 'Attachment not found',
        statusCode: 404,
      })
    })

    it('should remove file from s3', async () => {
      const { sessionCookie, userData } = await logInUser(fastify)

      const ticketInsertResponse = await fastify.db.execute(sql`
      INSERT INTO tickets (title, description, creator_uuid)
      VALUES ('test title', 'test description', ${userData.uuid})
      RETURNING *
    `)

      const attachmentInsertResponse = await fastify.db.execute(sql`
      INSERT INTO attachments ( file_type, ticket_uuid)
      VALUES ('text/plain', ${ticketInsertResponse.rows[0].uuid})
      RETURNING *
    `)

      const response = await request(fastify.server)
        .delete(`/attachments/${attachmentInsertResponse.rows[0].uuid}`)
        .set('Cookie', sessionCookie)

      expect(response.body).toStrictEqual({
        data: attachmentInsertResponse.rows,
      })

      expect(s3Mock.calls()).toHaveLength(1)

      const getAttachmentsResponse = await fastify.db.execute(sql`
        SELECT * FROM attachments
        `)

      expect(getAttachmentsResponse.rows).toStrictEqual([])
    })
  })
})
