import { sql } from 'drizzle-orm'
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '../schema'

export const seedRolesAndPermissions = async (
  db: PostgresJsDatabase<typeof schema>
) => {
  try {
    await db.execute(sql`
      INSERT INTO roles (name, description)
      VALUES ('admin', 'admin role'), ('user', 'user role')
      `)

    await db.execute(sql`
        INSERT INTO permissions (name, description)
        VALUES ('create:user', 'create user'), ('read:user', 'read user'), ('update:user', 'update user'), ('delete:user', 'delete user') 
        `)

    await db.execute(sql`
          INSERT INTO role_permissions (role_uuid, permission_uuid)
          VALUES 
          ((SELECT uuid FROM roles WHERE name = 'user'), (SELECT uuid FROM permissions WHERE name = 'create:user')),
          ((SELECT uuid FROM roles WHERE name = 'user'), (SELECT uuid FROM permissions WHERE name = 'read:user')),
          ((SELECT uuid FROM roles WHERE name = 'user'), (SELECT uuid FROM permissions WHERE name = 'update:user'))
          `)
  } catch (error) {
    console.error('Error seeding roles and permissions:', error)
  }
}
