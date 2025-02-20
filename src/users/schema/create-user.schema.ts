import { Static, Type } from '@sinclair/typebox'

export const createUserDto = Type.Object({
  first_name: Type.String(),
  last_name: Type.String(),
  email: Type.String({ format: 'email' }),
  avatar_url: Type.Optional(Type.Union([Type.String(), Type.Null()])),
})

export type CreateUser = Static<typeof createUserDto>
