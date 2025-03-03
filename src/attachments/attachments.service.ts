import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { httpErrors } from '@fastify/sensible'
import { sql } from 'drizzle-orm'
import { FastifyInstance, FastifyRequest } from 'fastify'
import { getTicketHandler } from '../tickets/tickets.service'

export const getAttachment = async (app: FastifyInstance, uuid: string) => {
  const result = await app.db.execute(sql`
    SELECT * FROM attachments WHERE uuid = ${uuid}
    `)

  if (!result.rows.length) {
    throw httpErrors.notFound('Attachment not found')
  }

  return result.rows[0]
}

export const postAttachmentsHandler = async (
  app: FastifyInstance,
  request: FastifyRequest
) => {
  if (
    !process.env.AWS_ACCESS_KEY ||
    !process.env.AWS_SECRET_KEY ||
    !process.env.AWS_LOCATION
  ) {
    throw new Error('AWS_ACCESS_KEY, AWS_SECRET_KEY, AWS_LOCATION are not set')
  }

  const s3 = new S3Client({
    region: process.env.AWS_LOCATION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_KEY,
    },
  })

  const { ticket_uuid } = request.query as { ticket_uuid: string }
  const data = await request.file()

  if (!ticket_uuid) {
    throw httpErrors.badRequest('ticket_uuid is required')
  }

  await getTicketHandler(app, ticket_uuid)

  if (!data) {
    throw httpErrors.badRequest('no file uploaded')
  }

  const s3key = crypto.randomUUID()

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: s3key,
    Body: await data.toBuffer(),
    ContentType: data.mimetype,
  })

  await s3.send(command)

  const url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_LOCATION}.amazonaws.com/${s3key}`

  const result = await app.db.execute(sql`
    INSERT INTO attachments (ticket_uuid, file_name, file_type, uuid, url)
    VALUES (${ticket_uuid}, ${data.filename}, ${data.mimetype}, ${s3key}, ${url})
    RETURNING *
    `)

  return result.rows

  // way to return signed url

  // const getCommand = new GetObjectCommand({
  //   Bucket: process.env.AWS_BUCKET_NAME,
  //   Key: s3key,
  // })
  // const fileUrl = await getSignedUrl(s3, getCommand, { expiresIn: 604800 })
  // return { fileUrl }
}

export const deleteAttachmentsHandler = async (
  app: FastifyInstance,
  request: FastifyRequest
) => {
  const { uuid } = request.params as { uuid: string }

  if (
    !process.env.AWS_ACCESS_KEY ||
    !process.env.AWS_SECRET_KEY ||
    !process.env.AWS_LOCATION
  ) {
    throw new Error('AWS_ACCESS_KEY, AWS_SECRET_KEY, AWS_LOCATION are not set')
  }

  const s3 = new S3Client({
    region: process.env.AWS_LOCATION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_KEY,
    },
  })

  await getAttachment(app, uuid)

  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: uuid,
  })

  await s3.send(command)

  const result = await app.db.execute(sql`
    DELETE FROM attachments WHERE uuid = ${uuid}
    RETURNING *
    `)

  return result.rows
}
