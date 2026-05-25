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
import type { MoveDirection } from '../common/dto/move-direction.dto';
import type { CreateDetailDto } from './dto/create-detail.dto';
import type { UpdateDetailDto } from './dto/update-detail.dto';
import { DetailService } from './detail.service';

@Controller('details')
export class DetailController {
  constructor(private readonly detailService: DetailService) {}

  @Post()
  create(@Body() body: CreateDetailDto) {
    return this.detailService.create(body);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateDetailDto) {
    return this.detailService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.detailService.remove(id);
  }

  @Patch(':id/move')
  move(
    @Param('id', ParseIntPipe) id: number,
    @Body('direction') direction: MoveDirection,
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
