import { httpErrors } from '@fastify/sensible'
import { FastifyInstance, FastifyRequest } from 'fastify'
import { TCreateSubscriptionSchema } from './schema/create-subscription'

export const createSubscriptionHandler = async (
  app: FastifyInstance,
  request: FastifyRequest<{ Body: TCreateSubscriptionSchema }>
) => {
  const { priceId } = request.body

  try {
    /**
     * Payment intent creates checkout outside of the app
     * */
    // const prices = await app.stripe.prices.list({
    //   lookup_keys: [lookupKey],
    //   expand: ['data.product'],
    // })
    // const session = await app.stripe.checkout.sessions.create({
    //   line_items: [
    //     {
    //       price: prices.data[0].id,
    //       quantity: 1,
    //     },
    //   ],
    //   mode: 'subscription',
    //   success_url: 'http://localhost:5173',
    //   cancel_url: 'http://localhost:5173',
    // })
    // return session
    // let customer
    // const existingCustomer = await app.stripe.customers.list({
    //   limit: 1,
    //   email: app.user?.email,
    // })
    /**
     * intent with ui mode embedded
     * */

    const sessions = await app.stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      currency: 'pln',
      return_url: 'http://localhost:5173?session_id={CHECKOUT_SESSION_ID}',
    })

    return { clientSecret: sessions.client_secret }
  } catch (e) {
    console.log(e)
    throw httpErrors.internalServerError()
  }
}

export const stripeWebhookHandler = async (
  app: FastifyInstance,
  request: FastifyRequest
) => {
  const sig = request.headers['stripe-signature']

  let event

  try {
    event = app.stripe.webhooks.constructEvent(
      request.raw,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err: unknown) {
    if (err instanceof Error) {
      return httpErrors.badRequest(`Webhook Error: ${err.message}`)
    } else {
      console.error('Unexpected error type:', err)
      return httpErrors.internalServerError('An unexpected error occurred.')
    }
  }

  console.log('event', event)
  switch (event.type) {
    case 'checkout.session.completed':
      console.log('event.data', event.data)
      break
    default:
      break
  }
}
