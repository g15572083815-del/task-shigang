import { request } from './request'
import type { Detail } from '../types'

export function fetchDetails(categoryId: number) {
  return request.get<Detail[]>(`/category/${categoryId}/details`)
}

export function createDetail(data: {
  categoryId: number
  code: string
  name: string
  content?: string | null
  material?: string | null
  rule?: string | null
  unit: string
}) {
  return request.post<Detail>('/details', data)
}

export function updateDetail(
  id: number,
  data: {
    code?: string
    name?: string
    content?: string | null
    material?: string | null
    rule?: string | null
    unit?: string
  },
) {
  return request.put<Detail>(`/details/${id}`, data)
}

export function deleteDetail(id: number) {
  return request.delete(`/details/${id}`)
}

export function moveDetail(id: number, direction: 'up' | 'down') {
  return request.patch<Detail[]>(`/details/${id}/move`, { direction })
}

export function discardDetail(id: number) {
  return request.patch<Detail[]>(`/details/${id}/discard`)
}

export function enableDetail(id: number) {
  return request.patch<Detail[]>(`/details/${id}/enable`)
}
