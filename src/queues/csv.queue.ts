import { Queue } from 'bullmq'
import { connection } from '../workers/csv.worker'

export const csvQueue = new Queue<{ jobData: string }>('csvQueue', {
  connection,
  defaultJobOptions: {
    attempts: parseInt(process.env.JOB_RETRY_ATTEMPTS || '3'),
    removeOnComplete: process.env.NODE_ENV === 'test' ? true : false,
  },
})

// async function checkQueue() {
//   const jobCounts = await csvQueue.getJobCounts()
//   console.log('jobCounts', jobCounts)
// }

// checkQueue()
