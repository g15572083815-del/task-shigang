import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CategoryNode,
  collectCategoryIds,
  getMaxOrder,
  getSiblingCategories,
  isRootCategory,
} from '../common/category-tree.util';
import { PrismaService } from '../prisma/prisma.service';
import { MoveDirection } from '../common/dto/move-direction.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const categorySelect = {
  id: true,
  code: true,
  name: true,
  remark: true,
  parentId: true,
  status: true,
  order: true,
} as const;

type CategoryDetailRow = {
  id: number;
  code: string;
  name: string;
  content: string | null;
  material: string | null;
  rule: string | null;
  unit: string;
  status: string;
  order: number;
};

function toSafeNumber(value: unknown): number {
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (typeof value === 'number') {
    return value;
  }
  return Number(value);
}

function mapCategoryDetailRows(
  rows: Record<string, unknown>[],
): CategoryDetailRow[] {
  return rows.map((row) => ({
    id: toSafeNumber(row.id),
    code: String(row.code),
    name: String(row.name),
    content: row.content == null ? null : String(row.content),
    material: row.material == null ? null : String(row.material),
    rule: row.rule == null ? null : String(row.rule),
    unit: String(row.unit),
    status: String(row.status),
    order: toSafeNumber(row.order),
  }));
}

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findDetailsByCategoryId(categoryId: number) {
    const category = await this.getCategoryOrThrow(categoryId);
    const versionId = category.versionId;

    const rows = await this.prisma.$queryRaw<Record<string, unknown>[]>`
      WITH RECURSIVE subtree AS (
        SELECT
          c.id,
          ARRAY[c."order", c.id] AS sort_path
        FROM "Category" c
        WHERE c.id = ${categoryId}
          AND c."versionId" = ${versionId}

        UNION ALL

        SELECT
          c.id,
          s.sort_path || ARRAY[c."order", c.id]
        FROM "Category" c
        INNER JOIN subtree s ON c."parentId" = s.id
        WHERE c."versionId" = ${versionId}
      ),
      ordered_categories AS (
        SELECT
          id,
          ROW_NUMBER() OVER (ORDER BY sort_path) AS tree_ord
        FROM subtree
      )
      SELECT
        d.id,
        d.code,
        d.name,
        d.content,
        d.material,
        d.rule,
        d.unit,
        d.status,
        d."order"
      FROM "Detail" d
      INNER JOIN ordered_categories oc ON d."categoryId" = oc.id
      ORDER BY oc.tree_ord, d."order", d.id
    `;

    return mapCategoryDetailRows(rows);
  }

  async create(dto: CreateCategoryDto) {
    this.validateCategoryFields(dto.code, dto.name);

    const parent = await this.getCategoryOrThrow(dto.parentId);
    if (parent.versionId !== dto.versionId) {
      throw new BadRequestException('分类版本不一致');
    }
    if (isRootCategory(parent) && dto.parentId !== parent.id) {
      throw new BadRequestException('父级分类无效');
    }

    const order = await this.getNextCategoryOrder(dto.versionId, dto.parentId);

    return this.prisma.category.create({
      data: {
        versionId: dto.versionId,
        parentId: dto.parentId,
        code: dto.code.trim(),
        name: dto.name.trim(),
        remark: dto.remark?.trim() ?? '',
        status: '启用',
        order,
      },
      select: categorySelect,
    });
  }

  async update(id: number, dto: UpdateCategoryDto) {
    const category = await this.getCategoryOrThrow(id);
    if (isRootCategory(category)) {
      throw new BadRequestException('系统默认分类不可编辑');
    }

    const code = dto.code !== undefined ? dto.code : category.code;
    const name = dto.name !== undefined ? dto.name : category.name;
    this.validateCategoryFields(code, name);

    return this.prisma.category.update({
      where: { id },
      data: {
        code: code.trim(),
        name: name.trim(),
        remark:
          dto.remark !== undefined
            ? (dto.remark?.trim() ?? '')
            : category.remark,
      },
      select: categorySelect,
    });
  }

  async remove(id: number) {
    const category = await this.getCategoryOrThrow(id);
    if (isRootCategory(category)) {
      throw new BadRequestException('系统默认分类不可删除');
    }

    const categories = await this.getCategoryNodes(category.versionId);
    const categoryIds = collectCategoryIds(categories, id);

    const detailCount = await this.prisma.detail.count({
      where: { categoryId: { in: categoryIds } },
    });
    if (detailCount > 0) {
      throw new BadRequestException('分类下存在明细，不允许删除！');
    }

    const idsToDelete = categoryIds.filter((itemId) => {
      const node = categories.find((item) => item.id === itemId);
      return node && !isRootCategory({ parentId: node.parentId, name: node.name ?? '', code: node.code ?? '' });
    });

    await this.prisma.category.deleteMany({
      where: { id: { in: idsToDelete } },
    });

    return { success: true };
  }

  async move(id: number, direction: MoveDirection) {
    const category = await this.getCategoryOrThrow(id);
    if (isRootCategory(category)) {
      throw new BadRequestException('系统默认分类不可移动');
    }

    const categories = await this.getCategoryNodes(category.versionId);
    const siblings = getSiblingCategories(categories, category);
    const index = siblings.findIndex((item) => item.id === id);

    if (direction === 'up' && index <= 0) {
      throw new BadRequestException('已经在最上方');
    }
    if (direction === 'down' && index >= siblings.length - 1) {
      throw new BadRequestException('已经在最下方');
    }

    const target =
      direction === 'up' ? siblings[index - 1] : siblings[index + 1];

    await this.prisma.$transaction([
      this.prisma.category.update({
        where: { id: category.id },
        data: { order: target.order },
      }),
      this.prisma.category.update({
        where: { id: target.id },
        data: { order: category.order },
      }),
    ]);

    return this.findCategoriesByVersion(category.versionId);
  }

  async discard(id: number) {
    const category = await this.getCategoryOrThrow(id);
    if (isRootCategory(category)) {
      throw new BadRequestException('系统默认分类不可废弃');
    }
    if (category.status === '废弃') {
      throw new BadRequestException('当前分类已是废弃状态');
    }

    const categories = await this.getCategoryNodes(category.versionId);
    const categoryIds = collectCategoryIds(categories, id);

    await this.prisma.$transaction(async (tx) => {
      for (const categoryId of categoryIds) {
        const current = await tx.category.findUnique({ where: { id: categoryId } });
        if (!current || current.status === '废弃') {
          continue;
        }

        const siblings = await tx.category.findMany({
          where: {
            versionId: current.versionId,
            parentId: current.parentId,
          },
          select: { order: true },
        });

        await tx.category.update({
          where: { id: categoryId },
          data: {
            status: '废弃',
            originalOrder: current.order,
            order: getMaxOrder(siblings) + 1,
          },
        });
      }

      const details = await tx.detail.findMany({
        where: { categoryId: { in: categoryIds }, status: '启用' },
      });

      for (const detail of details) {
        const siblingDetails = await tx.detail.findMany({
          where: { categoryId: detail.categoryId },
          select: { order: true },
        });

        await tx.detail.update({
          where: { id: detail.id },
          data: {
            status: '废弃',
            originalOrder: detail.order,
            order: getMaxOrder(siblingDetails) + 1,
          },
        });
      }
    });

    return this.findCategoriesByVersion(category.versionId);
  }

  async enable(id: number) {
    const category = await this.getCategoryOrThrow(id);
    if (isRootCategory(category)) {
      throw new BadRequestException('系统默认分类不可操作');
    }
    if (category.status === '启用') {
      throw new BadRequestException('当前分类已是启用状态');
    }

    const categories = await this.getCategoryNodes(category.versionId);
    const categoryIds = collectCategoryIds(categories, id);

    await this.prisma.$transaction(async (tx) => {
      for (const categoryId of categoryIds) {
        const current = await tx.category.findUnique({ where: { id: categoryId } });
        if (!current || current.status === '启用') {
          continue;
        }

        await tx.category.update({
          where: { id: categoryId },
          data: {
            status: '启用',
            order: current.originalOrder ?? current.order,
            originalOrder: null,
          },
        });
      }

      const details = await tx.detail.findMany({
        where: { categoryId: { in: categoryIds }, status: '废弃' },
      });

      for (const detail of details) {
        await tx.detail.update({
          where: { id: detail.id },
          data: {
            status: '启用',
            order: detail.originalOrder ?? detail.order,
            originalOrder: null,
          },
        });
      }
    });

    return this.findCategoriesByVersion(category.versionId);
  }

  private async findCategoriesByVersion(versionId: number) {
    return this.prisma.category.findMany({
      where: { versionId },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
      select: categorySelect,
    });
  }

  private async getNextCategoryOrder(versionId: number, parentId: number) {
    const rows = await this.prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT COALESCE(MAX("order"), 0) + 1 AS next_order
      FROM "Category"
      WHERE "versionId" = ${versionId} AND "parentId" = ${parentId}
    `;
    return toSafeNumber(rows[0]?.next_order ?? 1);
  }

  private async getCategoryOrThrow(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('分类不存在');
    }

    return category;
  }

  private async getCategoryNodes(versionId: number): Promise<CategoryNode[]> {
    return this.prisma.category.findMany({
      where: { versionId },
      select: { id: true, parentId: true, order: true, name: true, code: true },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });
  }

  private validateCategoryFields(code: string, name: string) {
    if (!code?.trim()) {
      throw new BadRequestException('编码不能为空');
    }
    if (!name?.trim()) {
      throw new BadRequestException('名称不能为空');
    }
  }
}
