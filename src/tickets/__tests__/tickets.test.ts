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
import logInUser from '../../database/helpers/loginUser'
import * as emailService from '../../email/email.service'
import { createTicket } from '../../factories/ticket.factory'

describe('tickets', () => {
  let pgContainer: StartedTestContainer
  let fastify: FastifyInstance

  beforeAll(async () => {
    vi.spyOn(emailService, 'sendEmail').mockImplementation(() =>
      Promise.resolve()
    )

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

    it('should return tickets with no attachments', async () => {
      const { sessionCookie, userData } = await logInUser(fastify)

      const ticket1 = await createTicket(fastify.db, {
        creator_uuid: userData.uuid,
      })

      const ticket2 = await createTicket(fastify.db, {
        creator_uuid: userData.uuid,
      })

      const response = await request(fastify.server)
        .get('/tickets')
        .set('Cookie', sessionCookie)

      expect(response.body).toEqual({
        data: [
          {
            ...ticket1,
            attachments: [],
          },
          {
            ...ticket2,
            attachments: [],
          },
        ],
      })
    })

    it('should return tickets with assigned attachments', async () => {
      const { sessionCookie, userData } = await logInUser(fastify)

      const ticket1 = await createTicket(fastify.db, {
        creator_uuid: userData.uuid,
      })

      const ticket2 = await createTicket(fastify.db, {
        creator_uuid: userData.uuid,
      })

      const attachment = {
        file_type: 'text/plain',
        ticket_uuid: ticket1.uuid,
      }

      await fastify.db.execute(sql`
        INSERT INTO attachments ( file_type, ticket_uuid)
        VALUES (${attachment.file_type}, ${attachment.ticket_uuid})
      `)

      const response = await request(fastify.server)
        .get('/tickets')
        .set('Cookie', sessionCookie)

      expect(response.body).toEqual({
        data: [
          {
            ...ticket1,
            attachments: [
              {
                ...attachment,
                created_at: expect.any(String),
                updated_at: expect.any(String),
                uuid: expect.any(String),
                file_name: null,
                file_size: null,
              },
            ],
          },
          {
            ...ticket2,
            attachments: [],
          },
        ],
      })
    })
  })

  describe('/GET tickets/:uuid', () => {
    it('should return unauthorized', async () => {
      const response = await request(fastify.server).get(
        '/tickets/0e4adf5a-fcbb-4034-ac21-a15a761705ec'
      )

      expect(response.body).toEqual({
        error: 'Unauthorized',
        message: 'unauthorized',
        statusCode: 401,
      })
    })

    it('should return 404 when ticket not found', async () => {
      const { sessionCookie } = await logInUser(fastify)

      const response = await request(fastify.server)
        .get('/tickets/0e4adf5a-fcbb-4034-ac21-a15a761705ec')
        .set('Cookie', sessionCookie)

      expect(response.statusCode).toBe(404)
      expect(response.body).toEqual({
        error: 'Not Found',
        message: 'Ticket not found',
        statusCode: 404,
      })
    })

    it('should return ticket', async () => {
      const { sessionCookie, userData } = await logInUser(fastify)

      const ticket = await createTicket(fastify.db, {
        creator_uuid: userData.uuid,
      })

      const response = await request(fastify.server)
        .get(`/tickets/${ticket.uuid}`)
        .set('Cookie', sessionCookie)

      expect(response.body).toEqual({
        data: [
          {
            ...ticket,
          },
        ],
      })
    })
  })

  describe('/POST tickets', () => {
    it('should return unauthorized', async () => {
      const response = await request(fastify.server).post('/tickets').send({
        title: 'test',
        description: 'test',
      })

      expect(response.body).toEqual({
        error: 'Unauthorized',
        message: 'unauthorized',
        statusCode: 401,
      })
    })

    it('should create ticket', async () => {
      const { sessionCookie, userData } = await logInUser(fastify)

      const ticket = {
        title: 'test title',
        description: 'test description',
      }

      const response = await request(fastify.server)
        .post('/tickets')
        .set('Cookie', sessionCookie)
        .send(ticket)

      expect(response.statusCode).toBe(200)
      expect(response.body).toEqual({
        data: [
          {
            ...ticket,
            created_at: expect.any(String),
            updated_at: expect.any(String),
            uuid: expect.any(String),
            assignee_uuid: null,
            creator_uuid: userData.uuid,
          },
        ],
      })
    })
  })

  describe('/PATCH tickets/:uuid', () => {
    it('should return unauthorized', async () => {
      const response = await request(fastify.server)
        .patch('/tickets/0e4adf5a-fcbb-4034-ac21-a15a761705ec')
        .send({})

      expect(response.body).toEqual({
        error: 'Unauthorized',
        message: 'unauthorized',
        statusCode: 401,
      })
    })

    it('should return 404 when ticket not found', async () => {
      const { sessionCookie } = await logInUser(fastify)

      const response = await request(fastify.server)
        .patch('/tickets/0e4adf5a-fcbb-4034-ac21-a15a761705eb')
        .set('Cookie', sessionCookie)
        .send({})

      expect(response.statusCode).toBe(404)
      expect(response.body).toEqual({
        error: 'Not Found',
        message: 'Ticket not found',
        statusCode: 404,
      })
    })

    it('should update ticket title', async () => {
      const { sessionCookie, userData } = await logInUser(fastify)

      const ticket = await createTicket(fastify.db, {
        creator_uuid: userData.uuid,
      })
      const newTitle = 'new title'

      const response = await request(fastify.server)
        .patch(`/tickets/${ticket.uuid}`)
        .set('Cookie', sessionCookie)
        .send({
          title: newTitle,
        })

      expect(response.statusCode).toBe(200)
      expect(response.body).toEqual({
        data: [
          {
            ...ticket,
            title: newTitle,
          },
        ],
      })
    })

    it('should update ticket', async () => {
      const { sessionCookie, userData } = await logInUser(fastify)

      const ticket = await createTicket(fastify.db, {
        creator_uuid: userData.uuid,
      })

      const ticketUpdateBody = {
        title: 'new title',
        description: 'new description',
      }

      const response = await request(fastify.server)
        .patch(`/tickets/${ticket.uuid}`)
        .set('Cookie', sessionCookie)
        .send(ticketUpdateBody)

      expect(response.statusCode).toBe(200)
      expect(response.body).toEqual({
        data: [
          {
            ...ticket,
            ...ticketUpdateBody,
          },
        ],
      })
    })
  })

  describe('/DELETE tickets/:uuid', () => {
    it('should return unauthorized', async () => {
      const response = await request(fastify.server)
        .delete('/tickets/0e4adf5a-fcbb-4034-ac21-a15a761705ec')
        .send({})

      expect(response.body).toEqual({
        error: 'Unauthorized',
        message: 'unauthorized',
        statusCode: 401,
      })
    })

    it('should return 404 when ticket not found', async () => {
      const { sessionCookie } = await logInUser(fastify)

      const response = await request(fastify.server)
        .patch('/tickets/0e4adf5a-fcbb-4034-ac21-a15a761705eb')
        .set('Cookie', sessionCookie)
        .send({})

      expect(response.statusCode).toBe(404)
      expect(response.body).toEqual({
        error: 'Not Found',
        message: 'Ticket not found',
        statusCode: 404,
      })
    })

    it('should delete ticket', async () => {
      const { sessionCookie, userData } = await logInUser(fastify)

      const ticket = await createTicket(fastify.db, {
        creator_uuid: userData.uuid,
      })

      const response = await request(fastify.server)
        .delete(`/tickets/${ticket.uuid}`)
        .set('Cookie', sessionCookie)

      expect(response.statusCode).toBe(200)
      expect(response.body).toEqual({
        data: [ticket],
      })

      const tickets = await fastify.db.execute(sql`
        SELECT * FROM tickets
        `)

      expect(tickets.rows).toHaveLength(0)
    })
  })
})
