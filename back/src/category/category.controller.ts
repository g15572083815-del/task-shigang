import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import type { MoveDirection } from '../common/dto/move-direction.dto';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryService } from './category.service';

@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get(':categoryId/details')
  findDetailsByCategoryId(@Param('categoryId', ParseIntPipe) categoryId: number) {
    return this.categoryService.findDetailsByCategoryId(categoryId);
  }

  @Post()
  create(@Body() body: CreateCategoryDto) {
    return this.categoryService.create(body);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateCategoryDto) {
    return this.categoryService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.remove(id);
  }

  @Patch(':id/move')
  move(
    @Param('id', ParseIntPipe) id: number,
    @Body('direction') direction: MoveDirection,
  ) {
    return this.categoryService.move(id, direction);
  }

  @Patch(':id/discard')
  discard(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.discard(id);
  }

  @Patch(':id/enable')
  enable(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.enable(id);
  }
}
