type TransformResponse<T, M extends Record<string, any> = {}> = { data: T } & M

export const transformResponse = <T, M extends Record<string, any> = {}>(
  data: T,
  meta?: M
): TransformResponse<T, M> => ({
  data,
  ...((meta ?? {}) as M),
})
