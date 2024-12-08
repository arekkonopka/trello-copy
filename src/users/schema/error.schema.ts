import { Type } from '@sinclair/typebox'

export const errorSchema = Type.Object({
  statusCode: Type.Number(),
  error: Type.String(),
  message: Type.String(),
})
