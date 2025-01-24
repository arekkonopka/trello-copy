import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import fastifyAuth from '@fastify/auth'
import isUserLoggedInDecorator from './decorators/isUserLoggedIn'

const authPlugin: FastifyPluginAsync = fp(async (app) => {
  app.register(fastifyAuth)
  isUserLoggedInDecorator(app)
})

export default authPlugin
