import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '../../database/schema'
import { userFactory } from '../../factories/users.factory'
import { TUserSchema } from '../../users/schema/user.schema'
import { sql } from 'drizzle-orm'
import { randomUUID } from 'crypto'

export const createUser = async (
  db: PostgresJsDatabase<typeof schema>,
  overrides?: Partial<TUserSchema>
) => {
  const user = userFactory.build()

  const overrideUser = {
    ...user,
    ...overrides,
    uuid: overrides?.uuid ? overrides.uuid : randomUUID(),
  }

  const result = await db.execute(sql`
    INSERT INTO users 
    (first_name, last_name, email, uuid)
    VALUES (${overrideUser.first_name}, ${overrideUser.last_name}, ${overrideUser.email}, ${overrideUser.uuid})
    `)

  return result.rows
}
