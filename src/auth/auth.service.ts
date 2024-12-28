import * as bcrypt from 'bcrypt'
import { FastifyInstance, FastifyRequest } from 'fastify'

import { TLoginSchema } from './schema/login.schema'
import { createUser, findUserByEmail } from '../users/users.service'
import { httpErrors } from '@fastify/sensible'
import { sql } from 'drizzle-orm'
import { TRegisterSchema } from './schema/register.schema'
import { sendEmail } from '../email/email.service'
import { generateOTP } from 'otp-agent'

export const loginHandler = async (
  app: FastifyInstance,
  request: FastifyRequest
) => {
  const { email, password } = request.body as TLoginSchema
  const session = request.session

  if (!session?.sessionId || !session?.cookie?.expires) {
    throw httpErrors.badRequest('Invalid session')
  }

  const [user] = await findUserByEmail(app, email)

  if (!user) {
    throw httpErrors.badRequest('User not found')
  }

  const userCredentials = await getUserCredentials(app, user.uuid)

  if (!userCredentials) {
    throw httpErrors.badRequest('User credentials not found')
  }

  const isPasswordVerified = await verifyPassword(
    password,
    userCredentials.password
  )

  if (!isPasswordVerified) {
    throw httpErrors.unauthorized('Invalid credentials')
  }

  await app.db.execute(sql`
    UPDATE auth
    SET expires_at = ${session.cookie.expires}, session_id = ${session.sessionId}
    WHERE uuid = ${userCredentials.uuid}
    `)

  return { message: 'User successfully logged in' }
}

export const verifyPassword = (password: string, hash: string) => {
  return bcrypt.compare(password, hash)
}

export const getUserCredentials = async (
  app: FastifyInstance,
  uuid: string
) => {
  const result = await app.db.execute(
    sql`
    SELECT * FROM auth
    WHERE user_uuid = ${uuid}
    `
  )

  return result.rows?.[0]
}

export const hashPassword = (password: string) => {
  const salt = 10

  return bcrypt.hash(password, salt)
}

export const registerHandler = async (
  app: FastifyInstance,
  body: TRegisterSchema
) => {
  const { email, password, first_name, last_name } = body

  const existingUser = await findUserByEmail(app, email)

  if (existingUser.length > 0) {
    throw httpErrors.badRequest('User already exist')
  }

  const user = await createUser(app, { email, first_name, last_name })
  const hashedPassword = await hashPassword(password)
  const otp = generateOTP()

  await app.db.execute(sql`
    INSERT INTO auth (password, user_uuid, otp)
    VALUES (${hashedPassword}, ${user.uuid}, ${otp})
  `)

  sendEmail(app, {
    to: email,
    subject: 'Welcome to app',
    templateName: 'welcome',
    templateBody: {
      name: first_name,
      verificationCode: otp,
    },
  })

  return [user]
}

export const getUserOtp = async (app: FastifyInstance, uuid: string) => {
  const { rows } = await app.db.execute(sql`
      SELECT otp FROM auth 
      WHERE user_uuid = ${uuid}
    `)

  return rows[0].otp
}

export const compareOtp = (otp: string, providedOtp: string) => {
  return otp === providedOtp
}

export const verifyOtp = async (
  app: FastifyInstance,
  body: { otp: string; email: string }
) => {
  const user = await findUserByEmail(app, body.email)

  if (!user.length) {
    throw httpErrors.notFound('User not found')
  }

  const userOtp = await getUserOtp(app, user[0].uuid)

  if (!userOtp) {
    throw httpErrors.notFound('Otp not found')
  }

  if (!compareOtp(userOtp, body.otp)) {
    throw httpErrors.unprocessableEntity('Incorrect Otp')
  }

  await app.db.execute(sql`
      UPDATE auth
      SET is_email_verified = true
      WHERE user_uuid = ${user[0].uuid}
    `)
}
