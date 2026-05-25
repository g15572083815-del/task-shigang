import { Injectable, NotFoundException } from '@nestjs/common';
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

  async findCategories(versionId: number) {
    const version = await this.prisma.version.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      throw new NotFoundException('版本不存在');
    }

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
