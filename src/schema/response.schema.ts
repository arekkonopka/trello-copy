import { TSchema, Type } from '@sinclair/typebox'

export const responseSchema = <T extends TSchema>(dataType: T) =>
  Type.Object({
    data: Type.Array(dataType),
  })
