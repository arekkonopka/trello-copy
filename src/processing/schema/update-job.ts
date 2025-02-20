import { Static } from '@sinclair/typebox'
import { jobSchema } from './job'

export const updateJobSchema = jobSchema

export type TUpdateJob = Static<typeof updateJobSchema>
