import { FastifyRequest, FastifyReply } from 'fastify'
import { TRoleAction, TRoleSubject } from '../../types'
import { httpErrors } from '@fastify/sensible'

export const checkAbility = (action: TRoleAction, subject: TRoleSubject) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.ability) {
      throw httpErrors.unauthorized('unauthorized')
    }

    if (!request.ability.can(action, subject)) {
      throw httpErrors.forbidden(
        `You don't have permission to ${action} ${subject}`
      )
    }
  }
}
