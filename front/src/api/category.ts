import { request } from './request'
import type { Category } from '../types'

export function createCategory(data: {
  versionId: number
  parentId: number
  code: string
  name: string
  remark?: string | null
}) {
  return request.post<Category>('/category', data)
}

export function updateCategory(
  id: number,
  data: { code?: string; name?: string; remark?: string | null },
) {
  return request.put<Category>(`/category/${id}`, data)
}

export function deleteCategory(id: number) {
  return request.delete(`/category/${id}`)
}

export function moveCategory(id: number, direction: 'up' | 'down') {
  return request.patch<Category[]>(`/category/${id}/move`, { direction })
}

export function discardCategory(id: number) {
  return request.patch<Category[]>(`/category/${id}/discard`)
}

export function enableCategory(id: number) {
  return request.patch<Category[]>(`/category/${id}/enable`)
}
