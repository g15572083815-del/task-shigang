import axios, { AxiosError, type AxiosResponse } from 'axios'
import { API_SUCCESS_CODE, isApiResponse } from '../types/api'

export const request = axios.create({
  baseURL: 'http://localhost:3000',
})

function unwrapSuccessResponse<T>(response: AxiosResponse): AxiosResponse<T> {
  const body = response.data

  if (!isApiResponse(body)) {
    return response
  }

  if (body.code !== API_SUCCESS_CODE) {
    throw new AxiosError(
      body.message || '请求失败',
      AxiosError.ERR_BAD_REQUEST,
      response.config,
      response.request,
      response,
    )
  }

  return {
    ...response,
    data: body.data as T,
  }
}

function normalizeErrorResponse(error: AxiosError) {
  const body = error.response?.data

  if (isApiResponse(body)) {
    error.response = {
      ...error.response!,
      data: {
        message: body.message,
        code: body.code,
        status: body.status,
      },
    }
  }

  return Promise.reject(error)
}

request.interceptors.response.use(unwrapSuccessResponse, normalizeErrorResponse)
