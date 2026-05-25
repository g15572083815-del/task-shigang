import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { getMaxOrder, isRootCategory } from '../common/category-tree.util';
import { CategoryService } from '../category/category.service';
import { MoveDirection } from '../common/dto/move-direction.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDetailDto } from './dto/create-detail.dto';
import { UpdateDetailDto } from './dto/update-detail.dto';

const detailSelect = {
  id: true,
  code: true,
  name: true,
  content: true,
  material: true,
  rule: true,
  unit: true,
  status: true,
  order: true,
} as const;

@Injectable()
export class DetailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoryService: CategoryService,
  ) {}

  async create(dto: CreateDetailDto) {
    this.validateRequiredFields(dto.code, dto.name, dto.unit);

    const category = await this.getCategoryOrThrow(dto.categoryId);
  if (isRootCategory(category)) {
      throw new BadRequestException('不能在全部分类下新增明细');
    }

    await this.ensureLeafCategory(category.id, category.versionId);

    const siblings = await this.prisma.detail.findMany({
      where: { categoryId: dto.categoryId },
      select: { order: true },
    });

    return this.prisma.detail.create({
      data: {
        categoryId: dto.categoryId,
        code: dto.code.trim(),
        name: dto.name.trim(),
        content: dto.content?.trim() ?? '',
        material: dto.material?.trim() ?? '',
        rule: dto.rule?.trim() ?? '',
        unit: dto.unit.trim(),
        status: '启用',
        order: getMaxOrder(siblings) + 1,
      },
      select: detailSelect,
    });
  }

  async update(id: number, dto: UpdateDetailDto) {
    const detail = await this.getDetailOrThrow(id);
    const code = dto.code !== undefined ? dto.code : detail.code;
    const name = dto.name !== undefined ? dto.name : detail.name;
    const unit = dto.unit !== undefined ? dto.unit : detail.unit;
    this.validateRequiredFields(code, name, unit);

    return this.prisma.detail.update({
      where: { id },
      data: {
        code: code.trim(),
        name: name.trim(),
        unit: unit.trim(),
        content:
          dto.content !== undefined
            ? (dto.content?.trim() ?? '')
            : detail.content,
        material:
          dto.material !== undefined
            ? (dto.material?.trim() ?? '')
            : detail.material,
        rule:
          dto.rule !== undefined ? (dto.rule?.trim() ?? '') : detail.rule,
      },
      select: detailSelect,
    });
  }

  async remove(id: number) {
    await this.getDetailOrThrow(id);
    await this.prisma.detail.delete({ where: { id } });
    return { success: true };
  }

  async move(id: number, direction: MoveDirection) {
    const detail = await this.getDetailOrThrow(id);
    const siblings = await this.prisma.detail.findMany({
      where: { categoryId: detail.categoryId },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });

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
      this.prisma.detail.update({
        where: { id: detail.id },
        data: { order: target.order },
      }),
      this.prisma.detail.update({
        where: { id: target.id },
        data: { order: detail.order },
      }),
    ]);

    return this.categoryService.findDetailsByCategoryId(detail.categoryId);
  }

  async discard(id: number) {
    const detail = await this.getDetailOrThrow(id);
    if (detail.status === '废弃') {
      throw new BadRequestException('当前明细已是废弃状态');
    }

    const siblings = await this.prisma.detail.findMany({
      where: { categoryId: detail.categoryId },
      select: { order: true },
    });

    await this.prisma.detail.update({
      where: { id },
      data: {
        status: '废弃',
        originalOrder: detail.order,
        order: getMaxOrder(siblings) + 1,
      },
    });

    return this.categoryService.findDetailsByCategoryId(detail.categoryId);
  }

  async enable(id: number) {
    const detail = await this.getDetailOrThrow(id);
    if (detail.status === '启用') {
      throw new BadRequestException('当前明细已是启用状态');
    }

    await this.prisma.detail.update({
      where: { id },
      data: {
        status: '启用',
        order: detail.originalOrder ?? detail.order,
        originalOrder: null,
      },
    });

    return this.categoryService.findDetailsByCategoryId(detail.categoryId);
  }

  private async ensureLeafCategory(categoryId: number, versionId: number) {
    const categories = await this.prisma.category.findMany({
      where: { versionId },
      select: { id: true, parentId: true },
    });

    const hasChild = categories.some((item) => item.parentId === categoryId);
    if (hasChild) {
      throw new BadRequestException('只能在末级分类下新增明细');
    }
  }

  private async getCategoryOrThrow(id: number) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('分类不存在');
    }
    return category;
  }

  private async getDetailOrThrow(id: number) {
    const detail = await this.prisma.detail.findUnique({ where: { id } });
    if (!detail) {
      throw new NotFoundException('明细不存在');
    }
    return detail;
  }

  private validateRequiredFields(code: string, name: string, unit: string) {
    if (!code?.trim()) {
      throw new BadRequestException('编码不能为空');
    }
    if (!name?.trim()) {
      throw new BadRequestException('项目名称不能为空');
    }
    if (!unit?.trim()) {
      throw new BadRequestException('计量单位不能为空');
    }
  }
}
