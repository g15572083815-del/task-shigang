import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VersionService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.version.findMany({
      orderBy: { id: 'desc' },
      select: {
        id: true,
        name: true,
        enabled: true,
      },
    });
  }

  async create(name: string) {
    const trimmed = name?.trim();
    if (!trimmed) {
      throw new BadRequestException('名称不能为空');
    }

    return this.prisma.$transaction(async (tx) => {
      const version = await tx.version.create({
        data: {
          name: trimmed,
          enabled: true,
        },
        select: {
          id: true,
          name: true,
          enabled: true,
        },
      });

      await tx.category.create({
        data: {
          name: '全部',
          code: '',
          remark: '',
          versionId: version.id,
          parentId: null,
          status: '启用',
          order: 0,
        },
      });

      return version;
    });
  }

  async update(id: number, name: string) {
    const trimmed = name?.trim();
    if (!trimmed) {
      throw new BadRequestException('名称不能为空');
    }

    await this.ensureExists(id);

    return this.prisma.version.update({
      where: { id },
      data: { name: trimmed },
      select: {
        id: true,
        name: true,
        enabled: true,
      },
    });
  }

  async remove(id: number) {
    await this.ensureExists(id);

    await this.prisma.$transaction(async (tx) => {
      const categories = await tx.category.findMany({
        where: { versionId: id },
        select: { id: true },
      });
      const categoryIds = categories.map((item) => item.id);

      if (categoryIds.length > 0) {
        await tx.detail.deleteMany({
          where: { categoryId: { in: categoryIds } },
        });
        await tx.category.deleteMany({
          where: { versionId: id },
        });
      }

      await tx.version.delete({ where: { id } });
    });

    return { success: true };
  }

  async toggleEnabled(id: number) {
    const version = await this.ensureExists(id);

    return this.prisma.version.update({
      where: { id },
      data: { enabled: !version.enabled },
      select: {
        id: true,
        name: true,
        enabled: true,
      },
    });
  }

  async findCategories(versionId: number) {
    await this.ensureExists(versionId);
    await this.ensureRootCategory(versionId);

    return this.prisma.category.findMany({
      where: { versionId },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        remark: true,
        parentId: true,
        status: true,
        order: true,
      },
    });
  }

  private async ensureExists(id: number) {
    const version = await this.prisma.version.findUnique({
      where: { id },
    });

    if (!version) {
      throw new NotFoundException('版本不存在');
    }

    return version;
  }

  private async ensureRootCategory(versionId: number) {
    const root = await this.prisma.category.findFirst({
      where: { versionId, parentId: null, name: '全部' },
    });

    if (!root) {
      await this.prisma.category.create({
        data: {
          name: '全部',
          code: '',
          remark: '',
          versionId,
          parentId: null,
          status: '启用',
          order: 0,
        },
      });
    }
  }
}
