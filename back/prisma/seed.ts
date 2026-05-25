import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.detail.deleteMany();
  await prisma.category.deleteMany();
  await prisma.version.deleteMany();

  const version2025 = await prisma.version.create({
    data: {
      name: '业务成本科目2025',
      enabled: false,
    },
  });

  const version2024 = await prisma.version.create({
    data: {
      name: '业务成本科目2024',
      enabled: true,
    },
  });

  async function seedCategories(versionId: number) {
    const root = await prisma.category.create({
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

    const earthwork = await prisma.category.create({
      data: {
        name: '土方工程',
        code: '001-001',
        remark: '',
        versionId,
        parentId: root.id,
        status: '启用',
        order: 1,
      },
    });

    await prisma.category.create({
      data: {
        name: '主体工程',
        code: '001-002',
        remark: '',
        versionId,
        parentId: root.id,
        status: '启用',
        order: 2,
      },
    });

    await prisma.category.create({
      data: {
        name: '其他工程',
        code: '001-003',
        remark: '',
        versionId,
        parentId: root.id,
        status: '废弃',
        order: 3,
      },
    });

    await prisma.category.create({
      data: {
        name: '基坑开挖',
        code: '001-001-001',
        remark: '',
        versionId,
        parentId: earthwork.id,
        status: '启用',
        order: 1,
      },
    });
  }

  await seedCategories(version2025.id);
  await seedCategories(version2024.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
