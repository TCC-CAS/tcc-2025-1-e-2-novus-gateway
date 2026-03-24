export const ok = <T>(data: T) => ({ data })

export const list = <T>(
  data: T[],
  page: number,
  pageSize: number,
  total: number
) => ({
  data,
  meta: {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  },
})
