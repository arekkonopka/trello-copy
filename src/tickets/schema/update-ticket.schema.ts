import { Static, Type } from '@sinclair/typebox'

export const updateTicketSchema = Type.Object({
  title: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
})

export type TUpdateTicketSchema = Static<typeof updateTicketSchema>
