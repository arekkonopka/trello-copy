import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import {
  loginGoogleHandler,
  loginHandler,
  logoutHandler,
  registerHandler,
  resetPasswordHandler,
  verifyOtp,
} from './auth.service'
import { loginResponse, loginSchema } from './schema/login.schema'
import { registerSchema, TRegisterSchema } from './schema/register.schema'
import { Type } from '@sinclair/typebox'
import { userSchema } from '../users/schema/user.schema'
import { otpSchema, TOtpSchema } from './schema/otp.schema'
import { resetPasswordSchema } from './schema/resetPassword.schema'

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

  fastify.post('/logout', async (request, reply) => {
    const result = await logoutHandler(fastify, request)

    reply.status(200).send(result)
  })

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

  fastify.post('/login/google', (req, reply) => {
    fastify.googleOAuth2.generateAuthorizationUri(
      req,
      reply,
      (err, authorizationEndpoint) => {
        if (err) console.error(err)
        reply.redirect(authorizationEndpoint)
      }
    )
  })

  fastify.get('/login/google/callback', async (req, reply) => {
    await loginGoogleHandler(fastify, req)

    if (!process.env.GOOGLE_REDIRECT_URL) {
      throw new Error('Missing redirect url')
    }

    return reply.redirect(process.env.GOOGLE_REDIRECT_URL)
  })

  fastify.post(
    '/reset-password',
    {
      schema: {
        body: resetPasswordSchema,
      },
      preHandler: fastify.auth([fastify.isUserLoggedIn]),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      await resetPasswordHandler(fastify, request)

      reply.status(200)
    }
  )

  done()
}

export default authRoutes
