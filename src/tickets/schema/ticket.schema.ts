import { createSelectSchema } from 'drizzle-typebox'
import { tickets } from '../../database/schema'
import { Static, Type } from '@sinclair/typebox'
import { attachmentsSchema } from '../../attachments/schema/attachments.schema'

export const ticketSchema = createSelectSchema(tickets)

export const ticketSchemaWithAttachments = Type.Intersect([
  ticketSchema,
  Type.Object({
    attachments: Type.Array(attachmentsSchema),
  }),
])

export type TTicketSchema = Static<typeof ticketSchema>
