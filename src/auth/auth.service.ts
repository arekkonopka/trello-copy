import * as bcrypt from 'bcrypt'
import fastify, { FastifyInstance, FastifyRequest } from 'fastify'

import { TLoginSchema } from './schema/login.schema'
import { createUser, findUserByEmail } from '../users/users.service'
import { httpErrors } from '@fastify/sensible'
import { sql } from 'drizzle-orm'
import { TRegisterSchema } from './schema/register.schema'
import { sendEmail } from '../email/email.service'
import { generateOTP } from 'otp-agent'
import { TResetPasswordSchema } from './schema/resetPassword.schema'
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '../database/schema'

// test user
// {
//   "email": "arekcommerce@gmail.com",
//   "password": "1234",
//   "first_name": "arek",
//   "last_name": "konopka"
// }

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
    INSERT INTO session (user_uuid, session_id, expires_at)
    VALUES (${user.uuid}, ${session.sessionId}, ${session.cookie.expires})`)

  return { message: 'User successfully logged in' }
}

export const logoutHandler = async (
  app: FastifyInstance,
  request: FastifyRequest
) => {
  const sessionId = request.session.sessionId

  if (!sessionId) {
    throw httpErrors.badRequest('Invalid session')
  }

  const result = await app.db.execute(sql`
    UPDATE session 
    SET is_active = false
    WHERE session_id = ${sessionId}`)

  if (result.rowCount === 0) {
    throw httpErrors.internalServerError(
      'Failed to log out. No session updated.'
    )
  }
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

export const getUserBySessionId = async (
  db: PostgresJsDatabase<typeof schema>,
  sessionId: string
) => {
  const result = await db.execute(
    sql`
    SELECT * FROM session
    WHERE session_id = ${sessionId}
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

  await sendEmail(app, {
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

  const otp = rows?.[0]?.otp

  if (!otp) {
    throw httpErrors.notFound('Otp not found')
  }

  return otp
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

  if (!compareOtp(userOtp, body.otp)) {
    throw httpErrors.unprocessableEntity('Incorrect Otp')
  }

  await app.db.execute(sql`
      UPDATE auth
      SET is_email_verified = true
      WHERE user_uuid = ${user[0].uuid}
    `)
}

export const loginGoogleHandler = async (
  app: FastifyInstance,
  req: FastifyRequest
) => {
  const session = req.session

  if (!session?.sessionId || !session?.cookie?.expires) {
    throw httpErrors.badRequest('Invalid session')
  }

  const { token } =
    await app.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(req)

  const userResponse = await fetch(
    `https://www.googleapis.com/oauth2/v3/userinfo`,
    {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
    }
  )

  if (!userResponse.ok) {
    throw httpErrors.internalServerError(
      'Failed to fetch user info from Google'
    )
  }

  const userInfo = await userResponse.json()
  let dbUser = await findUserByEmail(app, userInfo.email)

  if (!dbUser) {
    dbUser = await app.db.execute(sql`
      INSERT INTO users (first_name, last_name, email, avatar_url)
      VALUES (${userInfo.given_name}, ${userInfo.family_name}, ${userInfo.email}, ${userInfo.avatar_url})
      `)
  }

  await app.db.execute(sql`
    INSERT INTO auth (expires_at, session_id, user_uuid)
    VALUES (${session.cookie.expires}, ${session.sessionId}, ${dbUser[0].uuid})
    `)
}

export const resetPasswordHandler = async (
  app: FastifyInstance,
  request: FastifyRequest
) => {
  const sessionId = request.session.sessionId
  const { oldPassword, newPassword } = request.body as TResetPasswordSchema

  if (oldPassword === newPassword) {
    throw httpErrors.badRequest(
      'New password cannot be the same as the old password.'
    )
  }

  const {
    rows: [session],
  } = await app.db.execute(sql`
    SELECT * FROM session
    WHERE session_id = ${sessionId}
  `)

  const {
    rows: [userCredentials],
  } = await app.db.execute(sql`
    SELECT * FROM auth
    WHERE user_uuid = ${session.user_uuid}
  `)

  const isPasswordVerified = await verifyPassword(
    oldPassword,
    userCredentials.password
  )

  if (!isPasswordVerified) {
    throw httpErrors.badRequest(
      'The provided old password does not match our records.'
    )
  }

  const hashedPassword = await hashPassword(newPassword)

  await app.db.execute(sql`
    UPDATE auth
    SET password = ${hashedPassword}
    WHERE user_uuid = ${session.user_uuid}
    `)
}
