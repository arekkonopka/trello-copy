import { Static, Type } from '@sinclair/typebox'

export const getUsersParams = Type.Object({
  search: Type.Optional(Type.String()),
  order_by: Type.Optional(
    Type.Union([Type.Literal('ASC'), Type.Literal('DESC')])
  ),
  limit: Type.Optional(Type.Number()),
  offset: Type.Optional(Type.Number()),
})

export type TGetUsersParams = Static<typeof getUsersParams>
