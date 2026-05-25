import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { CategoryService } from './category.service';

@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get(':categoryId/details')
  findDetailsByCategoryId(@Param('categoryId', ParseIntPipe) categoryId: number) {
    return this.categoryService.findDetailsByCategoryId(categoryId);
  }
}
