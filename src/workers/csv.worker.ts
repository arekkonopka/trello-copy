import { Worker, Job } from 'bullmq'
import Papa from 'papaparse'
import { CreateUser } from '../users/schema/create-user.schema'
import { csvValidation } from '../users/utils/csvValidation'
import IORedis from 'ioredis'
import { createJob, updateJob } from '../processing/processing.service'
import 'dotenv/config'
import { JobStatus } from '../processing/schema/job'
import { FastifyInstance } from 'fastify'

export const connection = new IORedis({
  maxRetriesPerRequest: null,
})

export const csvWorkerSetup = (fastify: FastifyInstance) => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set')
  }

  return new Worker(
    'csvQueue',
    async (job: Job) => {
      console.log(
        'process.env.DATABASE_URL inside Worker',
        process.env.DATABASE_URL
      )

      await createJob(fastify.db, {
        uuid: job.id as string,
        name: job.name,
        status: JobStatus.pending,
        data: job.data.csv,
        user_uuid: job.data.user_uuid,
      })

      await updateJob(fastify.db, {
        uuid: job.id as string,
        name: job.name,
        status: JobStatus.inProgress,
        data: job.data.csv,
        user_uuid: job.data.user_uuid,
      })

      // const jobs = await db.execute(sql`
      // SELECT * FROM jobs
      // WHERE uuid = ${job.id as string}
      // `)

      // console.log('jobs worker', jobs.rows)

      Papa.parse<CreateUser>(job.data.csv, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: async function (results) {
          const isValidHeaders = csvValidation.validateHeaders(
            results?.meta?.fields || []
          )
          if (!isValidHeaders) {
            await updateJob(fastify.db, {
              uuid: job.id as string,
              name: job.name,
              status: JobStatus.failed,
              data: job.data.csv,
              user_uuid: job.data.user_uuid,
              errors: JSON.stringify({
                message: 'Invalid headers',
              }),
            })
          }
          const rowsErrors = csvValidation.validateRow(
            results.data as CreateUser[]
          )
          if (rowsErrors.length) {
            const errorMessage = rowsErrors.map((error) => {
              if (error) {
                const field = error.error?.[0].instancePath.replace('/', '')
                return `Row ${error?.index + 1}: Field '${field}' ${
                  error.error?.[0].message
                }.`
              }
            })
            await updateJob(fastify.db, {
              uuid: job.id as string,
              name: job.name,
              status: JobStatus.failed,
              data: job.data.csv,
              user_uuid: job.data.user_uuid,
              errors: JSON.stringify(errorMessage),
            })
          }
        },
        error: async function (err) {
          await updateJob(fastify.db, {
            uuid: job.id as string,
            name: job.name,
            status: JobStatus.failed,
            data: job.data.csv,
            user_uuid: job.data.user_uuid,
            errors: JSON.stringify(err),
          })
        },
      })

      await updateJob(fastify.db, {
        uuid: job.id as string,
        name: job.name,
        status: JobStatus.completed,
        data: 'message: CSV parsed successfully',
        user_uuid: job.data.user_uuid,
      })
    },
    {
      connection,
    }
  )

  // csvWorker.on('active', async (job: Job) => {
  //   console.log('active')
  // })

  // csvWorker.on('progress', async (job: Job) => {
  //   console.log('progress')
  // })

  // csvWorker.on('completed', async (job: Job) => {
  //   console.log('completed')
  // })

  // csvWorker.on('failed', async (err) => {
  //   console.log('failed')
  // })

  // csvWorker.on('stalled', async () => {
  //   console.log('stalled')
  // })
}
