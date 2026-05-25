import { request } from './request'
import type { Category, Version } from '../types'

export function fetchVersions() {
  return request.get<Version[]>('/versions')
}

export function fetchCategories(versionId: number) {
  return request.get<Category[]>(`/versions/${versionId}/categories`)
}
