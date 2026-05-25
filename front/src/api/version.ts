import { request } from './request'
import type { Category, Version } from '../types'

export function fetchVersions() {
  return request.get<Version[]>('/versions')
}

export function fetchCategories(versionId: number) {
  return request.get<Category[]>(`/versions/${versionId}/categories`)
}

export function createVersion(name: string) {
  return request.post<Version>('/versions', { name })
}

export function updateVersion(id: number, name: string) {
  return request.put<Version>(`/versions/${id}`, { name })
}

export function deleteVersion(id: number) {
  return request.delete(`/versions/${id}`)
}

export function toggleVersion(id: number) {
  return request.patch<Version>(`/versions/${id}/toggle`)
}
