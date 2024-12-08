import { createSelectSchema } from 'drizzle-typebox'
import { Static } from '@sinclair/typebox'
import { users } from '../../database/schema'

export const userSchema = createSelectSchema(users)

export type TUserSchema = Static<typeof userSchema>
