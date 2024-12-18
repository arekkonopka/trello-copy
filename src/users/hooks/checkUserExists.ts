import { FastifyReply, FastifyRequest } from 'fastify'
import { getUser } from '../users.service'
import { TUserSchema } from '../schema/user.schema'

export const checkUserExists = async (
  request: FastifyRequest,
  reply: FastifyReply,
  done: () => void
) => {
  const { uuid } = request.body as TUserSchema
  const currentUser = await getUser(request.server, uuid)

  if (!currentUser.length) {
    return reply.notFound('User nof found')
  }

  done()
}
