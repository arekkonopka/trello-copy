import { eq, sql } from 'drizzle-orm'
import { FastifyInstance, FastifyRequest } from 'fastify'
import { CreateUser } from './schema/create-user.schema'
import { users } from '../database/schema'
import { TUpdateUser } from './schema/update-user.schema'
import { httpErrors } from '@fastify/sensible'
import { TGetUsersParams } from './schema/get-users.schema.js'
import { randomUUID } from 'crypto'
import { getUserBySessionId } from '../auth/auth.service'

export const getUsers = async (
  app: FastifyInstance,
  params: TGetUsersParams
) => {
  if ((params.limit && !params.offset) || (params.offset && !params.limit)) {
    throw httpErrors.badRequest(
      'Offset and limit are required when both are set'
    )
  }

  // RAW SQL
  let query = sql`SELECT * FROM users`

  if (params.search) {
    const search = `%${params.search}%`
    query = sql`${query} WHERE CONCAT(first_name, last_name) ILIKE ${search}`
  }

  if (params.order_by) {
    const orderBy =
      params.order_by.toUpperCase() === 'ASC' ? sql`ASC` : sql`DESC`

    query = sql`${query} ORDER BY CONCAT(first_name, last_name) ${orderBy}`
  }

  if (params.limit) {
    query = sql`${query} LIMIT ${params.limit}`
  }

  if (params.offset) {
    query = sql`${query} OFFSET ${params.offset}`
  }

  const result = await app.db.execute(query)

  // const result = await app.db
  //   .select()
  //   .from(users)
  //   .where(
  //     params.search
  //       ? or(
  //           ilike(users.first_name, `%${params.search}%`),
  //           ilike(users.last_name, `%${params.search}%`)
  //         )
  //       : undefined
  //   )
  //   .orderBy(
  //     params.order_by === 'ASC'
  //       ? asc(sql`(${users.first_name} || ' ' || ${users.last_name})`)
  //       : desc(sql`(${users.first_name} || ' ' || ${users.last_name})`)
  //   )
  //   .limit(params.limit || undefined)
  //   .offset(params.offset || undefined)

  return result.rows
}

export const getUser = async (app: FastifyInstance, uuid: string) => {
  const result = await app.db.execute(
    sql`SELECT * FROM users WHERE uuid = ${uuid}`
  )

  if (!result.rows.length) {
    throw httpErrors.notFound('User not found')
  }

  return result.rows
}

export const findUserByEmail = async (app: FastifyInstance, email: string) => {
  const result = await app.db.execute(
    sql`SELECT * FROM users WHERE email = ${email}`
  )

  return result.rows
}

export const createUser = async (app: FastifyInstance, user: CreateUser) => {
  const currentUser = await findUserByEmail(app, user.email)
  if (currentUser.length) {
    throw httpErrors.badRequest('User already exists')
  }

  const result = await app.db.execute(sql`
    INSERT INTO users (first_name, last_name, email, avatar_url)
    VALUES (${user.first_name}, ${user.last_name}, ${user.email}, ${
    user?.avatar_url ?? null
  })
    RETURNING *
    `)

  return result.rows[0]
}

export const updateUser = async (
  app: FastifyInstance,
  uuid: string,
  user: TUpdateUser
) => {
  const currentUser = await getUser(app, uuid)

  if (!currentUser.length) {
    throw httpErrors.badRequest('User not found')
  }

  const result = await app.db
    .update(users)
    .set(user)
    .where(eq(users.uuid, uuid))
    .returning()

  return result
}

export const deleteUser = async (app: FastifyInstance, uuid: string) => {
  const result = await app.db.execute(
    sql`DELETE FROM users WHERE uuid = ${uuid}`
  )

  if (!result.rowCount) {
    throw httpErrors.notFound('User not found')
  }

  return result
}

export const csvUploadHandler = async (
  app: FastifyInstance,
  request: FastifyRequest
) => {
  const data = await request.file()
  const sessionId = request.session?.sessionId
  const user = await getUserBySessionId(app.db, sessionId)

  if (!user) {
    throw httpErrors.notFound('User not found')
  }

  if (!data) {
    throw httpErrors.badRequest('no file uploaded')
  }

  if (data.mimetype !== 'text/csv') {
    throw httpErrors.unsupportedMediaType(
      'Invalid file type. Only CSV files are allowed.'
    )
  }

  const csv = await new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = []
    data.file.on('data', (chunk) => chunks.push(chunk))
    data.file.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    data.file.on('error', (err) => reject(err))
  })

  const jobId = randomUUID()

  await app.csvQueue.add(
    'parseCsv',
    { csv, user_uuid: user.user_uuid },
    { jobId, removeOnComplete: true, removeOnFail: true }
  )

  return jobId

  // OLD PARSING, without queues

  // const parsed = Papa.parse<CreateUser>(csv, {
  //   header: true,
  //   skipEmptyLines: true,
  //   dynamicTyping: true,
  //   complete: function (results) {
  //     const isValidHeaders = csvValidation.validateHeaders(
  //       results?.meta?.fields || []
  //     )

  //     if (!isValidHeaders) {
  //       throw httpErrors.badRequest('Invalid headers')
  //     }

  //     const rowsErrors = csvValidation.validateRow(results.data as CreateUser[])

  //     if (rowsErrors.length) {
  //       const errorMessage = rowsErrors.map((error) => {
  //         if (error) {
  //           const field = error.error?.[0].instancePath.replace('/', '')
  //           return `Row ${error?.index + 1}: Field '${field}' ${
  //             error.error?.[0].message
  //           }.`
  //         }
  //       })
  //       throw httpErrors.badRequest(JSON.stringify(errorMessage))
  //     }
  //   },
  // })

  // if (parsed.errors.length) {
  //   const errorMessage = parsed.errors.map((error) => {
  //     return `Row: ${error.row} has ${error.message}`
  //   })

  //   throw httpErrors.badRequest(JSON.stringify(errorMessage))
  // }

  // const users = await app.db.execute(sql`
  //   INSERT INTO users (first_name, last_name, email, avatar_url)
  //   VALUES
  //   ${sql.join(
  //     parsed.data.map(
  //       (user) =>
  //         sql`(${user.first_name}, ${user.last_name}, ${user.email}, ${user.avatar_url})`
  //     ),
  //     sql`, `
  //   )}
  //   RETURNING *
  // `)

  // return users.rows
}
