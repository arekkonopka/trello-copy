import oauthPlugin from '@fastify/oauth2'
import { FastifyInstance } from 'fastify'

const registerOauth2Provider = (app: FastifyInstance) => {
  const id = process.env.GOOGLE_CLIENT_ID
  const secret = process.env.GOOGLE_CLIENT_SECRET

  if (!id || !secret) {
    throw new Error('Missing OAuth configuration')
  }

  app.register(oauthPlugin, {
    name: 'googleOAuth2',
    scope: ['profile', 'email'],
    credentials: {
      client: {
        id,
        secret,
      },
      auth: oauthPlugin.GOOGLE_CONFIGURATION,
    },
    startRedirectPath: '/login/google',
    // ASK: Czy powinienem podawac pelny url?
    callbackUri: 'http://localhost:3000/login/google/callback',
  })
}

export default registerOauth2Provider
