import * as fs from 'fs'
import { FastifyInstance } from 'fastify'
import Handlebars from 'handlebars'

type TEmailBody = {
  to: string
  subject?: string
  templateName?: string
  templateBody?: Record<string, string>
}

export const sendEmail = async (app: FastifyInstance, body: TEmailBody) => {
  const { mailer } = app

  const templateSource = fs.readFileSync(
    `./src/email/templates/${body.templateName}.hbs`,
    'utf8'
  )
  const template = Handlebars.compile(templateSource)
  const html = template(body.templateBody)

  return await mailer.sendMail({
    to: body.to,
    subject: body.subject,
    html,
  })
}
