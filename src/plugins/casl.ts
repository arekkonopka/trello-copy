import { AbilityBuilder, PureAbility } from '@casl/ability'
import fp from 'fastify-plugin'
import * as schema from '../database/schema'
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { sql } from 'drizzle-orm'
import { AppAbility, TRoleAction, TRoleSubject } from '../types'
import { httpErrors } from '@fastify/sensible'

const detectSubjectType = (subject: TRoleSubject): TRoleSubject => {
  if (typeof subject === 'string') return subject as TRoleSubject

  return 'all'
}

const defineAbilityFor = async (
  userUuid: string,
  db: PostgresJsDatabase<typeof schema>
): Promise<AppAbility> => {
  const { can, build } = new AbilityBuilder<AppAbility>(PureAbility)

  try {
    const userRoleResult = await db.execute(
      sql`SELECT role_uuid FROM user_roles WHERE user_uuid = ${userUuid}`
    )

    if (!userRoleResult?.rows?.length) {
      throw httpErrors.notFound('User role not found')
    }

    const roleUuid = userRoleResult?.rows?.[0]?.role_uuid

    const roleResult = await db.execute(
      sql`SELECT name FROM roles WHERE uuid = ${roleUuid}`
    )

    if (roleResult?.rows?.[0]?.name === 'admin') {
      can('manage', 'all')
    }

    if (!roleUuid) {
      throw httpErrors.notFound('Role not found')
    }

    const permissionsResult = await db.execute(
      sql`
        SELECT p.name FROM permissions p
        INNER JOIN role_permissions rp ON p.uuid = rp.permission_uuid
        WHERE rp.role_uuid = ${roleUuid}
      `
    )

    permissionsResult.rows.forEach((permission: { name: string }) => {
      const [action, subject] = permission.name.split(':') as [
        TRoleAction,
        TRoleSubject
      ]
      can(action, subject)
    })

    return build({ detectSubjectType })
  } catch (error) {
    console.error('Error defining abilities:', error)
    throw error
  }
}

const PUBLIC_ROUTES = ['/register', '/login', '/verify-otp']

const caslPlugin = fp(async (fastify) => {
  fastify.addHook('preHandler', async (request) => {
    if (PUBLIC_ROUTES.includes(request.url)) {
      return
    }

    const { user } = request.session

    if (!user) {
      throw httpErrors.unauthorized('unauthorized')
    }

    const ability = await defineAbilityFor(user.uuid, fastify.db)
    request.ability = ability
  })
})

export default caslPlugin
