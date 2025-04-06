import fp from 'fastify-plugin'
import Stripe from 'stripe'

const stripePlugin = fp(async (fastify) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe secret key not found')
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  fastify.decorate('stripe', stripe)
})

export default stripePlugin
