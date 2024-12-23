import { Static, Type } from '@sinclair/typebox'

export const registerSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String(),
  first_name: Type.String(),
  last_name: Type.String(),
})

export type TRegisterSchema = Static<typeof registerSchema>
