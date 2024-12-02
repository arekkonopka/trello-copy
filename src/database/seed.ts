import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { users } from './schema'
import { faker } from '@faker-js/faker'
import * as dotenv from 'dotenv'

dotenv.config()

async function main() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  })

  const db = drizzle(pool)

  const data = []

  for (let i = 0; i < 99; i++) {
    data.push({
      first_name: faker.person.firstName(),
      last_name: faker.person.lastName(),
      email: faker.internet.email(),
      avatar_url: faker.image.avatar(),
    })
  }

  console.log('Seeding users...')
  await db.insert(users).values(data)
  console.log('Seeding complete!')
}

main()
