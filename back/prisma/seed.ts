import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });

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

  const excavation = await prisma.category.create({
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

  return excavation;
}

async function seedDetails(categoryId: number) {
  await prisma.detail.createMany({
    data: [
      {
        code: '001-001',
        name: '钢筋人工费',
        content: '自卸汽车倒运至场内指定地点',
        material: '装载机、压路机、挖掘机',
        rule: '按实际完成工程量',
        unit: '立方米',
        categoryId,
        status: '启用',
        order: 1,
      },
      {
        code: '001-002',
        name: '土方内倒',
        content: '自卸汽车倒运至场内指定地点',
        material: '装载机、压路机',
        rule: '按实际完成工程量',
        unit: '立方米',
        categoryId,
        status: '启用',
        order: 2,
      },
      {
        code: '001-003',
        name: '废弃示例项',
        content: '已废弃的明细数据',
        material: '',
        rule: '按实际完成工程量',
        unit: '立方米',
        categoryId,
        status: '废弃',
        order: 3,
      },
    ],
  });
}

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

  const excavation2025 = await seedCategories(version2025.id);
  const excavation2024 = await seedCategories(version2024.id);

  await seedDetails(excavation2025.id);
  await seedDetails(excavation2024.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
