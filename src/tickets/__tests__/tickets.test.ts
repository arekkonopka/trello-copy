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

      const ticket1 = {
        title: 'test title',
        description: 'test description',
        creator_uuid: userData.uuid,
      }

      const ticket2 = {
        title: 'test title 2',
        description: 'test description 2',
        creator_uuid: userData.uuid,
      }

      await fastify.db.execute(sql`
        INSERT INTO tickets (title, description, creator_uuid)
        VALUES (${ticket1.title}, ${ticket1.description}, ${ticket1.creator_uuid}),
        (${ticket2.title}, ${ticket2.description}, ${ticket2.creator_uuid})
        `)

      const response = await request(fastify.server)
        .get('/tickets')
        .set('Cookie', sessionCookie)

      expect(response.body).toEqual({
        data: [
          {
            ...ticket1,
            created_at: expect.any(String),
            updated_at: expect.any(String),
            uuid: expect.any(String),
            user_uuid: null,
            attachments: [],
          },
          {
            ...ticket2,
            created_at: expect.any(String),
            updated_at: expect.any(String),
            uuid: expect.any(String),
            user_uuid: null,
            attachments: [],
          },
        ],
      })
    })

    it('should return tickets with assigned attachments', async () => {
      const { sessionCookie, userData } = await logInUser(fastify)

      const ticket1 = {
        title: 'test title',
        description: 'test description',
        creator_uuid: userData.uuid,
      }

      const ticket2 = {
        title: 'test title 2',
        description: 'test description 2',
        creator_uuid: userData.uuid,
      }

      const ticketsResponse = await fastify.db.execute(sql`
        INSERT INTO tickets (title, description, creator_uuid)
        VALUES (${ticket1.title}, ${ticket1.description}, ${ticket1.creator_uuid}),
        (${ticket2.title}, ${ticket2.description}, ${ticket2.creator_uuid})
        RETURNING *
        `)

      const attachment = {
        file_type: 'text/plain',
        ticket_uuid: ticketsResponse.rows[0].uuid,
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
            created_at: expect.any(String),
            updated_at: expect.any(String),
            uuid: expect.any(String),
            user_uuid: null,
            attachments: [
              {
                ...attachment,
                created_at: expect.any(String),
                updated_at: expect.any(String),
                uuid: expect.any(String),
                url: null,
                file_name: null,
                file_size: null,
              },
            ],
          },
          {
            ...ticket2,
            created_at: expect.any(String),
            updated_at: expect.any(String),
            uuid: expect.any(String),
            user_uuid: null,
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

      const ticket = {
        title: 'test title',
        description: 'test description',
        creator_uuid: userData.uuid,
      }

      const ticketResponse = await fastify.db.execute(sql`
        INSERT INTO tickets (title, description, creator_uuid)
        VALUES (${ticket.title}, ${ticket.description}, ${ticket.creator_uuid})
        RETURNING *
        `)

      const response = await request(fastify.server)
        .get(`/tickets/${ticketResponse.rows[0].uuid}`)
        .set('Cookie', sessionCookie)

      expect(response.body).toEqual({
        data: [
          {
            ...ticket,
            created_at: expect.any(String),
            updated_at: expect.any(String),
            uuid: expect.any(String),
            user_uuid: null,
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
            user_uuid: null,
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

      expect(response.statusCode).toBe(404)
      expect(response.body).toEqual({
        error: 'Not Found',
        message: 'Ticket not found',
        statusCode: 404,
      })
    })

    it('should update ticket title', async () => {
      const { sessionCookie, userData } = await logInUser(fastify)

      const ticketResponse = await fastify.db.execute(sql`
        INSERT INTO tickets (title, description, creator_uuid)
        VALUES ('test title', 'test description', ${userData.uuid})
        RETURNING *
        `)

      const response = await request(fastify.server)
        .patch(`/tickets/${ticketResponse.rows[0].uuid}`)
        .set('Cookie', sessionCookie)
        .send({
          title: 'new title',
        })

      expect(response.statusCode).toBe(200)
      expect(response.body).toEqual({
        data: [
          {
            title: 'new title',
            description: 'test description',
            created_at: expect.any(String),
            updated_at: expect.any(String),
            uuid: expect.any(String),
            user_uuid: null,
            creator_uuid: userData.uuid,
          },
        ],
      })
    })

    it('should update ticket', async () => {
      const { sessionCookie, userData } = await logInUser(fastify)

      const ticketResponse = await fastify.db.execute(sql`
        INSERT INTO tickets (title, description, creator_uuid)
        VALUES ('test title', 'test description', ${userData.uuid})
        RETURNING *
        `)

      const ticketUpdateBody = {
        title: 'new title',
        description: 'new description',
      }

      const response = await request(fastify.server)
        .patch(`/tickets/${ticketResponse.rows[0].uuid}`)
        .set('Cookie', sessionCookie)
        .send(ticketUpdateBody)

      expect(response.statusCode).toBe(200)
      expect(response.body).toEqual({
        data: [
          {
            ...ticketUpdateBody,
            created_at: expect.any(String),
            updated_at: expect.any(String),
            uuid: expect.any(String),
            user_uuid: null,
            creator_uuid: userData.uuid,
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

      expect(response.statusCode).toBe(404)
      expect(response.body).toEqual({
        error: 'Not Found',
        message: 'Ticket not found',
        statusCode: 404,
      })
    })

    it('should delete ticket', async () => {
      const { sessionCookie, userData } = await logInUser(fastify)

      const ticket = {
        title: 'test ticket',
        description: 'test description',
        creator_uuid: userData.uuid,
      }

      const ticketResponse = await fastify.db.execute(sql`
        INSERT INTO tickets (title, description, creator_uuid)
        VALUES (${ticket.title}, ${ticket.description}, ${ticket.creator_uuid})
        RETURNING *
        `)

      const response = await request(fastify.server)
        .delete(`/tickets/${ticketResponse.rows[0].uuid}`)
        .set('Cookie', sessionCookie)

      expect(response.statusCode).toBe(200)
      expect(response.body).toEqual({
        data: [
          {
            ...ticket,
            created_at: expect.any(String),
            updated_at: expect.any(String),
            uuid: expect.any(String),
            user_uuid: null,
          },
        ],
      })

      const tickets = await fastify.db.execute(sql`
        SELECT * FROM tickets
        `)

      expect(tickets.rows).toHaveLength(0)
    })
  })
})
