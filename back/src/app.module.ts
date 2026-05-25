import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { VersionModule } from './version/version.module';

@Module({
  imports: [PrismaModule, VersionModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
