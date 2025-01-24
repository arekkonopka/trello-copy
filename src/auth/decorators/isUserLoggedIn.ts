import { httpErrors } from '@fastify/sensible'
import { sql } from 'drizzle-orm'
import { FastifyInstance, FastifyRequest } from 'fastify'

const isUserLoggedIn = async (fastify: FastifyInstance) => {
  fastify.decorate('isUserLoggedIn', async (request: FastifyRequest) => {
    const sessionId = request.session.sessionId

    const {
      rows: [userSession],
    } = await fastify.db.execute(sql`
        SELECT expires_at FROM session 
        WHERE session_id = ${sessionId}
         AND expires_at > NOW()
      `)

    if (!userSession) {
      throw httpErrors.unauthorized('unauthorized')
    }

    request.session.touch()

    await fastify.db.execute(sql`
            UPDATE session
            SET expires_at = ${request.session.cookie.expires}
            WHERE session_id = ${sessionId} 
          `)
  })
}

export default isUserLoggedIn
