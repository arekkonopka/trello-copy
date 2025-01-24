import { createSelectSchema } from 'drizzle-typebox'
import { auth } from '../../database/schema'
import { Static } from '@sinclair/typebox'

export const authSchema = createSelectSchema(auth)

export type TAuthSchema = Static<typeof authSchema>
