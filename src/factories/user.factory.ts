import { Factory } from 'fishery'
import { TUserSchema } from '../users/schema/user.schema'
import { faker } from '@faker-js/faker'

export const userFactory = Factory.define<Partial<TUserSchema>>(() => {
  return {
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    email: faker.internet.email(),
    password: faker.internet.password(),
    avatar_url: faker.image.avatar(),
  }
})
