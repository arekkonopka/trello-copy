import { Static, Type } from '@sinclair/typebox'

export const createUserDto = Type.Object({
  first_name: Type.String(),
  last_name: Type.String(),
  email: Type.String({ format: 'email' }),
})

export type CreateUser = Static<typeof createUserDto>
