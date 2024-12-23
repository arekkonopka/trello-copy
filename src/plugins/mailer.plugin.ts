import { FastifyInstance } from 'fastify'
import fastifyMailer from 'fastify-mailer'
import nodemailer from 'nodemailer'

export const mailerPlugin = (fastify: FastifyInstance) => {
  fastify.register(fastifyMailer, {
    defaults: { from: 'noreply@test.com' },
    transport: nodemailer.createTransport({
      host: 'sandbox.smtp.mailtrap.io',
      port: 465,
      secure: true,
      auth: {
        user: process.env.MAILER_USER,
        pass: process.env.MAILER_USER,
      },
    }),
  })
}
