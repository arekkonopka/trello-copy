import { createSelectSchema } from 'drizzle-typebox'
import { attachments } from '../../database/schema'
import { Static } from '@sinclair/typebox'

export const attachmentsSchema = createSelectSchema(attachments)

export type TAttachmentsSchema = Static<typeof attachmentsSchema>
