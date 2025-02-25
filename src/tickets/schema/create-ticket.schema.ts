import { Static, Type } from '@sinclair/typebox'

export const createTicketSchema = Type.Object({
  title: Type.String(),
  description: Type.String(),
  user_uuid: Type.Optional(Type.String()),
})

export type TCreateTicketSchema = Static<typeof createTicketSchema>
