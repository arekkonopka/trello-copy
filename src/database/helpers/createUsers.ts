import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { userFactory } from '../../factories/user.factory'
import { TUserSchema } from '../../users/schema/user.schema'
import { sql } from 'drizzle-orm'
import * as schema from '../../database/schema'

export const createUsers = async (
  db: PostgresJsDatabase<typeof schema>,
  count: number,
  overrides: Partial<TUserSchema>[] = []
) => {
  if (overrides.length > count) {
    throw new Error('Overrides length is greater than count')
  }

  const users = userFactory.buildList(count)

  if (overrides.length > 0) {
    overrides.forEach((override, index) => {
      if (users[index]) {
        users[index] = { ...users[index], ...override }
      }
    })
  }

  const result = await Promise.all(
    users.map((user) => {
      return db.execute(
        sql`INSERT INTO users (first_name, last_name, email, avatar_url)
        VALUES (${user.first_name}, ${user.last_name}, ${user.email}, ${user.avatar_url})`
      )
    })
  )
  return result.rows
}
