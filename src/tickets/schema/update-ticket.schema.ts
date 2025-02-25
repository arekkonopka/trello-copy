import { Static, Type } from '@sinclair/typebox'

export const updateTicketSchema = Type.Object({
  title: Type.String(),
  description: Type.String(),
  uuid: Type.String(),
})

export type TUpdateTicketSchema = Static<typeof updateTicketSchema>
