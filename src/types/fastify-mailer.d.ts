import { Transporter } from 'nodemailer'

export interface FastifyMailerNamedInstance {
  [namespace: string]: Transporter
}
export type FastifyMailer = FastifyMailerNamedInstance & Transporter

declare module 'fastify-mailer' {
  export interface FastifyMailerOptions {
    defaults: {
      from: string
    }
    transport: Transporter
  }

  const fastifyMailer: FastifyPluginAsync<FastifyMailerOptions>

  export default fastifyMailer
}
