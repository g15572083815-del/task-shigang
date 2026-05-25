export type CategoryNode = {
  id: number;
  parentId: number | null;
  order: number;
  name?: string;
  code?: string;
};

export function isRootCategory(category: {
  parentId: number | null;
  name: string;
  code?: string;
}) {
  return category.parentId === null && category.name === '全部';
}

export function collectCategoryIds(
  categories: CategoryNode[],
  rootId: number,
): number[] {
  const result: number[] = [];

  const walk = (parentId: number) => {
    result.push(parentId);
    categories
      .filter((item) => item.parentId === parentId)
      .forEach((item) => walk(item.id));
  };

  walk(rootId);
  return result;
}

export function getSiblingCategories(
  categories: CategoryNode[],
  category: CategoryNode,
) {
  return categories
    .filter((item) => item.parentId === category.parentId)
    .sort((a, b) => a.order - b.order || a.id - b.id);
}

export function getMaxOrder(items: { order: number }[]) {
  return items.reduce((max, item) => Math.max(max, item.order), 0);
}
