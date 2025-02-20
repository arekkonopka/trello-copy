import fastifyPlugin from 'fastify-plugin'
import { csvQueue } from '../queues/csv.queue'
import { FastifyInstance } from 'fastify'

const queuePlugin = (fastify: FastifyInstance, opts: any, done: Function) => {
  fastify.decorate('csvQueue', csvQueue)
  done()
}

export default fastifyPlugin(queuePlugin)
