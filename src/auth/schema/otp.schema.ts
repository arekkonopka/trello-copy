import { Type, Static } from '@sinclair/typebox'

export const otpSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  otp: Type.String({ format: 'regex', pattern: '^[0-9]{6}$' }),
})

export type TOtpSchema = Static<typeof otpSchema>
