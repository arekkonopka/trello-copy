import { Queue } from 'bullmq'
import { connection } from '../workers/csv.worker'

export const csvQueue = new Queue<{ jobData: string }>('csvQueue', {
  connection,
})

// async function checkQueue() {
//   const jobCounts = await csvQueue.getJobCounts()
//   console.log('jobCounts', jobCounts)
// }

// checkQueue()
