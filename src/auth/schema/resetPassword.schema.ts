import { Type, Static } from '@sinclair/typebox'

export const resetPasswordSchema = Type.Object({
  oldPassword: Type.String(),
  newPassword: Type.String(),
})

export type TResetPasswordSchema = Static<typeof resetPasswordSchema>
