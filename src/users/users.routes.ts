import { FastifyInstance } from 'fastify'
import {
  createUser,
  getUsers,
  updateUser,
  deleteUser,
  getUser,
} from './users.service.js'
import { CreateUser, createUserDto } from './schema/create-user.schema.js'
import { getUsersParams, TGetUsersParams } from './schema/get-users.schema.js'
import {
  TUpdateUser,
  updateUserDto,
  updateUserParams,
} from './schema/update-user.schema.js'
import { userSchema } from './schema/user.schema.js'
import {
  deleteUserParams,
  deleteUserResponse,
} from './schema/delete-user.params.js'
import { Type } from '@sinclair/typebox'
import { errorSchema } from './schema/error.schema.js'

const usersRoutes = (fastify: FastifyInstance, _: object, done: () => void) => {
  fastify.get(
    '/users',
    {
      schema: {
        querystring: getUsersParams,
        response: {
          200: Type.Array(userSchema),
          400: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const params = request.query as TGetUsersParams

      const users = await getUsers(fastify, params)
      reply.send(users)
    }
  )

  fastify.get(
    '/users/:uuid',
    {
      schema: {
        response: {
          200: Type.Array(userSchema),
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { uuid } = request.params as { uuid: string }

      const user = await getUser(fastify, uuid)

      reply.send(user)
    }
  )

  fastify.post(
    '/users',
    {
      schema: {
        body: createUserDto,
        response: {
          200: Type.Array(userSchema),
          400: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const user = request.body as CreateUser

      const result = await createUser(fastify, user)
      reply.send(result)
    }
  )

  fastify.patch(
    '/users/:uuid',
    {
      schema: {
        body: updateUserDto,
        params: updateUserParams,
        response: {
          200: Type.Array(userSchema),
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { uuid } = request.params as { uuid: string }

      const result = await updateUser(
        fastify,
        uuid,
        request.body as TUpdateUser
      )

      reply.send(result)
    }
  )

  fastify.delete(
    '/users/:uuid',
    {
      schema: {
        params: deleteUserParams,
        response: {
          200: deleteUserResponse,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { uuid } = request.params as { uuid: string }

      await deleteUser(fastify, uuid)

      reply.send({ message: `User ${uuid} deleted` })
    }
  )

  done()
}

export default usersRoutes
