import { httpErrors } from '@fastify/sensible'
import { sql } from 'drizzle-orm'
import { FastifyInstance } from 'fastify'
import { TUpdateJob } from './schema/update-job'
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '../database/schema'
import { JobStatus } from './schema/job'

// export const checkJobExist = async (
//   db: PostgresJsDatabase<typeof schema>,
//   jobId: string
// ) => {
//   const jobData = await db.execute(sql`
//     SELECT * FROM jobs
//     WHERE uuid = ${jobId}
//     `)
//   console.log('jobData', jobData)
//   if (!jobData.rows.length) {
//     throw httpErrors.notFound(`job: ${jobId} was not found`)
//   }

//   return jobData.rows[0]
// }

export const getJobById = async (
  db: PostgresJsDatabase<typeof schema>,
  jobId: string
) => {
  const jobData = await db.execute(sql`
    SELECT * FROM jobs
    WHERE uuid = ${jobId}
    `)

  return jobData.rows[0]
}

export const createJob = async (
  db: PostgresJsDatabase<typeof schema>,
  data: TUpdateJob
) => {
  console.log(
    'process.env.DATABASE_URL create createJob ',
    process.env.DATABASE_URL
  )

  const existingJob = await getJobById(db, data.uuid)
  if (existingJob) {
    throw httpErrors.badRequest('Job already exists')
  }

  const user = await db.execute(sql`SELECT * FROM users`)

  const result = await db
    .execute(
      sql`
      INSERT INTO 
      jobs 
      (uuid, name, status, data, errors, user_uuid)
      VALUES 
      (${data.uuid}, ${data.name}, ${data.status}, ${
        JSON.stringify(data?.data) ?? null
      }, ${JSON.stringify(data?.errors) ?? null}, ${data.user_uuid})
        RETURNING *
        `
    )
    .catch((err) => {
      // console.log('err', err)
    })

  return result.rows[0]
}

export const updateJob = async (
  db: PostgresJsDatabase<typeof schema>,
  data: TUpdateJob
) => {
  // const jobs = await db.execute(sql`
  //   SELECT * FROM jobs
  //   WHERE uuid = ${data.uuid}
  //   `)

  // console.log('jobs', jobs)
  const result = await db.execute(sql`
    UPDATE jobs 
    SET 
      name = ${data.name}, 
      status = ${data.status}, 
      data = ${JSON.stringify(data?.data) ?? null}, 
      errors = ${JSON.stringify(data?.errors) ?? null}, 
      user_uuid = ${data.user_uuid}
    WHERE uuid = ${data.uuid}
    `)

  // if (result.rowCount === 0) {
  //   throw httpErrors.internalServerError('Failed to update job')
  // }

  return result.rows[0]
}
