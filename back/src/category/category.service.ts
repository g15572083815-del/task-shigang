import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type CategoryNode = {
  id: number;
  parentId: number | null;
  order: number;
};

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findDetailsByCategoryId(categoryId: number) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('分类不存在');
    }

    const categories = await this.prisma.category.findMany({
      where: { versionId: category.versionId },
      select: { id: true, parentId: true, order: true },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });

    const categoryIds = this.collectCategoryIds(categories, categoryId);

    const details = await this.prisma.detail.findMany({
      where: { categoryId: { in: categoryIds } },
      select: {
        id: true,
        code: true,
        name: true,
        content: true,
        material: true,
        rule: true,
        unit: true,
        status: true,
        order: true,
        categoryId: true,
      },
    });

    const categoryOrder = new Map(
      categoryIds.map((id, index) => [id, index]),
    );

    return details
      .sort((a, b) => {
        const categoryIndexA = categoryOrder.get(a.categoryId) ?? 0;
        const categoryIndexB = categoryOrder.get(b.categoryId) ?? 0;
        if (categoryIndexA !== categoryIndexB) {
          return categoryIndexA - categoryIndexB;
        }
        if (a.order !== b.order) {
          return a.order - b.order;
        }
        return a.id - b.id;
      })
      .map(({ categoryId: _categoryId, ...detail }) => detail);
  }

  private collectCategoryIds(
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
}
