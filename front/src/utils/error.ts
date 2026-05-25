import axios from 'axios'

export function isUserCancel(error: unknown) {
  return error === 'cancel' || error === 'close'
}

export function getErrorMessage(error: unknown, fallback = '操作失败') {
  if (isUserCancel(error)) {
    return ''
  }

  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined
    const message = data?.message

    if (typeof message === 'string' && message.trim()) {
      return message
    }

    if (Array.isArray(message) && message.length > 0) {
      return message.join('，')
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}
