import { request } from './request'
import type { Detail } from '../types'

export function fetchDetails(categoryId: number) {
  return request.get<Detail[]>(`/category/${categoryId}/details`)
}
