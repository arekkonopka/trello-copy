import { Static, Type } from '@sinclair/typebox'

export const jobStatus = Type.Union([
  Type.Literal('pending'),
  Type.Literal('in progress'),
  Type.Literal('completed'),
  Type.Literal('failed'),
])

export type TJobStatus = Static<typeof jobStatus>

export const jobSchema = Type.Object({
  uuid: Type.String(),
  user_uuid: Type.Optional(Type.String()),
  name: Type.Optional(Type.String()),
  status: Type.Optional(jobStatus),
  data: Type.Optional(Type.String()),
  errors: Type.Optional(Type.String()),
})

export type TJob = Static<typeof jobSchema>

export enum JobStatus {
  pending = 'pending',
  inProgress = 'in progress',
  completed = 'completed',
  failed = 'failed',
}
