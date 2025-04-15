import { Type, Static } from '@sinclair/typebox'

export const createSubscriptionSchema = Type.Object({
  priceId: Type.String(),
})

export type TCreateSubscriptionSchema = Static<typeof createSubscriptionSchema>
