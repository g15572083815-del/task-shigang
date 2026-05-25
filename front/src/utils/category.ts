import type { Category } from '../types'

export function isPersistedCategory(
  row?: Pick<Category, 'id' | '_isNew'> | null,
): row is Category {
  return !!row && !row._isNew && row.id > 0
}

export function isRootCategory(row: Pick<Category, 'name' | 'code' | 'parentId'>) {
  return row.parentId === null && row.name === '全部'
}

export function isLeafCategory(categories: Category[], categoryId: number) {
  return !categories.some((item) => item.parentId === categoryId)
}

export function getRootCategory(categories: Category[]) {
  return categories.find((item) => isRootCategory(item))
}

export function isSameParentId(
  a: number | null | undefined,
  b: number | null | undefined,
) {
  return (a ?? null) === (b ?? null)
}

export function getSiblingCategories(categories: Category[], row: Category) {
  return categories
    .filter(
      (item) =>
        isSameParentId(item.parentId, row.parentId) && !isRootCategory(item),
    )
    .sort((a, b) => a.order - b.order || a.id - b.id)
}

export function canMoveUp(categories: Category[], row: Category) {
  const siblings = getSiblingCategories(categories, row)
  return siblings.findIndex((item) => item.id === row.id) > 0
}

export function canMoveDown(categories: Category[], row: Category) {
  const siblings = getSiblingCategories(categories, row)
  const index = siblings.findIndex((item) => item.id === row.id)
  return index >= 0 && index < siblings.length - 1
}

export function canMoveDetailUp(details: { id: number }[], row: { id: number }) {
  return details.findIndex((item) => item.id === row.id) > 0
}

export function canMoveDetailDown(details: { id: number }[], row: { id: number }) {
  const index = details.findIndex((item) => item.id === row.id)
  return index >= 0 && index < details.length - 1
}
