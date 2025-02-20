import { ajv } from '../../utils/ajv'
import { CreateUser, createUserDto } from '../schema/create-user.schema'

const VALID_HEADERS = Object.keys(createUserDto.properties)

const validateHeaders = (headers: string[]) => {
  if (VALID_HEADERS.length !== headers.length) {
    return false
  }

  return VALID_HEADERS.every((header) => headers.includes(header))
}

const validateRow = (rows: CreateUser[]) => {
  const validate = ajv.compile(createUserDto)

  const errors = rows
    .map((row, index) => {
      const isValid = validate(row)

      return isValid ? null : { index, error: validate.errors }
    })
    .filter(Boolean)

  return errors
}

export const csvValidation = {
  validateHeaders,
  validateRow,
}
