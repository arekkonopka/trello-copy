import { FastifyInstance } from 'fastify'
import { loginHandler, registerHandler, verifyOtp } from './auth.service'
import { loginResponse, loginSchema } from './schema/login.schema'
import { registerSchema, TRegisterSchema } from './schema/register.schema'
import { Type } from '@sinclair/typebox'
import { userSchema } from '../users/schema/user.schema'
import { otpSchema, TOtpSchema } from './schema/otp.schema'

const authRoutes = (fastify: FastifyInstance, _: object, done: () => void) => {
  fastify.post(
    '/register',
    {
      schema: {
        body: registerSchema,
        response: {
          200: Type.Array(userSchema),
        },
      },
    },
    async (request, reply) => {
      const body = request.body as TRegisterSchema
      const result = await registerHandler(fastify, body)
      return reply.send(result)
    }
  )

  fastify.post(
    '/login',
    {
      schema: {
        body: loginSchema,
        response: {
          201: loginResponse,
        },
      },
    },
    async (request, reply) => {
      const result = await loginHandler(fastify, request)

      reply.status(201).send(result)
    }
  )

  fastify.post(
    '/verify-otp',
    {
      schema: {
        body: otpSchema,
      },
    },
    async (request, reply) => {
      await verifyOtp(fastify, request.body as TOtpSchema)

      reply.status(200)
    }
  )

  done()
}

export default authRoutes
