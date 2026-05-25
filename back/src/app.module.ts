import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CategoryModule } from './category/category.module';
import { DetailModule } from './detail/detail.module';
import { PrismaModule } from './prisma/prisma.module';
import { VersionModule } from './version/version.module';

@Module({
  imports: [PrismaModule, VersionModule, CategoryModule, DetailModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
