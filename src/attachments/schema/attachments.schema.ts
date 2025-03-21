import { createSelectSchema } from 'drizzle-typebox'
import { attachments } from '../../database/schema'
import { Static, Type } from '@sinclair/typebox'

export const attachmentsSchema = createSelectSchema(attachments)

export const attachmentSchemaWithUrl = Type.Intersect([
  attachmentsSchema,
  Type.Object({
    url: Type.String(),
  }),
])

export type TAttachmentsSchema = Static<typeof attachmentsSchema>
