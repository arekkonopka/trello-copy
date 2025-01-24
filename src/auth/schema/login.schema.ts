import { Static, Type } from '@sinclair/typebox'

export const loginSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String(),
})

export type TLoginSchema = Static<typeof loginSchema>

export const loginResponse = Type.Object({
  message: Type.String(),
})
