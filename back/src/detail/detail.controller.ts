import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { DetailService } from './detail.service';

@Controller('details')
export class DetailController {
  constructor(private readonly detailService: DetailService) {}

  @Post()
  create(
    @Body()
    body: {
      categoryId: number;
      code: string;
      name: string;
      content?: string | null;
      material?: string | null;
      rule?: string | null;
      unit: string;
    },
  ) {
    return this.detailService.create(body);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      code?: string;
      name?: string;
      content?: string | null;
      material?: string | null;
      rule?: string | null;
      unit?: string;
    },
  ) {
    return this.detailService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.detailService.remove(id);
  }

  @Patch(':id/move')
  move(
    @Param('id', ParseIntPipe) id: number,
    @Body('direction') direction: 'up' | 'down',
  ) {
    return this.detailService.move(id, direction);
  }

  @Patch(':id/discard')
  discard(@Param('id', ParseIntPipe) id: number) {
    return this.detailService.discard(id);
  }

  @Patch(':id/enable')
  enable(@Param('id', ParseIntPipe) id: number) {
    return this.detailService.enable(id);
  }
}
