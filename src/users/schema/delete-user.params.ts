import { Type } from '@sinclair/typebox'

export const deleteUserParams = Type.Object({
  uuid: Type.String(),
})

export const deleteUserResponse = Type.Object({
  message: Type.String(),
})
