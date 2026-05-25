export interface Version {
  id: number
  name: string
  enabled: boolean
}

export interface Category {
  id: number
  code: string
  name: string
  remark: string | null
  parentId: number | null
  status: string
  order: number
}
