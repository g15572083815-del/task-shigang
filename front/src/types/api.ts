/** 与后端统一的 API 响应体 */
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
  status: number
  timestamp: string
  path: string
}

export const API_SUCCESS_CODE = 0

export function isApiResponse(value: unknown): value is ApiResponse {
  if (!value || typeof value !== 'object') {
    return false
  }

  const body = value as Record<string, unknown>
  return (
    typeof body.code === 'number' &&
    typeof body.message === 'string' &&
    'data' in body &&
    typeof body.status === 'number'
  )
}
