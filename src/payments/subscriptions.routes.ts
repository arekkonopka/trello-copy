import { FastifyInstance } from 'fastify'
import {
  createSubscriptionHandler,
  stripeWebhookHandler,
} from './subscriptions.service'
import {
  createSubscriptionSchema,
  TCreateSubscriptionSchema,
} from './schema/create-subscription'

const subscriptionsRoutes = (
  fastify: FastifyInstance,
  _: object,
  done: () => void
) => {
  fastify.get('/subscriptions/prices', async (_, reply) => {
    const response = await fastify.stripe.prices.list()
    reply.send(response)
  })

  fastify.get('/subscriptions/payment-methods', async (_, reply) => {
    const response = await fastify.stripe.paymentMethod.list()
    reply.send(response)
  })

  fastify.post<{ Body: TCreateSubscriptionSchema }>(
    '/subscriptions/payment-intent',
    {
      schema: {
        body: createSubscriptionSchema,
      },
      preHandler: fastify.auth([fastify.isUserLoggedIn]),
    },
    async (request, reply) => {
      const response = await createSubscriptionHandler(fastify, request)
      reply.send(response)
    }
  )

  fastify.post('/webhooks/stripe', async (request, reply) => {
    const response = await stripeWebhookHandler(fastify, request)
    reply.send(response)
  })

  done()
}

export default subscriptionsRoutes
