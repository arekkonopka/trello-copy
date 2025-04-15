import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '../schema'
import { TRole } from '../../types'
import { sql } from 'drizzle-orm'

export const createRole = async (
  db: PostgresJsDatabase<typeof schema>,
  role: TRole,
  userUuid: string
) => {
  await db.execute(sql`
          INSERT INTO user_roles (user_uuid, role_uuid)
          VALUES (${userUuid}, (SELECT uuid FROM roles WHERE name = ${role})) 
          `)
}

export const updateRole = async (
  db: PostgresJsDatabase<typeof schema>,
  role: TRole,
  userUuid: string
) => {
  await db.execute(sql`
          UPDATE user_roles SET role_uuid = (SELECT uuid FROM roles WHERE name = ${role}) WHERE user_uuid = ${userUuid}
          `)
}
