import { Static, Type } from '@sinclair/typebox'

export const updateUserDto = Type.Object({
  first_name: Type.Optional(Type.String()),
  last_name: Type.Optional(Type.String()),
  email: Type.Optional(Type.String()),
})

export const updateUserParams = Type.Object({
  uuid: Type.String(),
})

export type TUpdateUser = Static<typeof updateUserDto>
