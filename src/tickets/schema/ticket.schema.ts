import { createSelectSchema } from 'drizzle-typebox'
import { tickets } from '../../database/schema'
import { Static } from '@sinclair/typebox'

export const ticketSchema = createSelectSchema(tickets)

export type TTicketSchema = Static<typeof ticketSchema>
