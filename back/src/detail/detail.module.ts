import { Module } from '@nestjs/common';
import { CategoryModule } from '../category/category.module';
import { DetailController } from './detail.controller';
import { DetailService } from './detail.service';

@Module({
  imports: [CategoryModule],
  controllers: [DetailController],
  providers: [DetailService],
})
export class DetailModule {}
