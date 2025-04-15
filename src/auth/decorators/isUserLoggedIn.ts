import { httpErrors } from '@fastify/sensible'
import { sql } from 'drizzle-orm'
import { FastifyInstance, FastifyRequest } from 'fastify'

const isUserLoggedIn = async (fastify: FastifyInstance) => {
  fastify.decorate('user', null)

  fastify.decorate('isUserLoggedIn', async (request: FastifyRequest) => {
    const sessionId = request.session.sessionId

    const {
      rows: [userSession],
    } = await fastify.db.execute(sql`
        SELECT 
            session.expires_at,
            users.*
        FROM session 
        JOIN users ON session.user_uuid = users.uuid
        WHERE session.session_id = ${sessionId}
         AND session.expires_at > NOW()
      `)

    if (!userSession) {
      throw httpErrors.unauthorized('unauthorized')
    }

    const { expiresAt, ...userData } = userSession
    fastify.user = userData

    request.session.touch()

    await fastify.db.execute(sql`
            UPDATE session
            SET expires_at = ${request.session.cookie.expires}
            WHERE session_id = ${sessionId} 
          `)
  })
}

export default isUserLoggedIn
