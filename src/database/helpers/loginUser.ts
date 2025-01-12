import { sql } from 'drizzle-orm'
import { FastifyInstance } from 'fastify'
import request from 'supertest'

const logInUser = async (fastify: FastifyInstance) => {
  // register
  const userData = {
    email: 'user@test.com',
    password: '1234',
    first_name: 'John',
    last_name: 'Doe',
  }

  const {
    body: [user],
  } = await request(fastify.server).post('/register').send(userData)

  // login
  const loginResponse = await request(fastify.server).post('/login').send({
    email: userData.email,
    password: userData.password,
  })

  const cookie = loginResponse.headers['set-cookie'][0]

  const credentials = await fastify.db.execute(sql`
      SELECT * FROM auth
      WHERE user_uuid = ${user.uuid}
      `)

  return {
    userCredentials: credentials.rows[0],
    sessionCookie: cookie,
    userData,
  }
}

export default logInUser
