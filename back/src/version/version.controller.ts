import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { VersionService } from './version.service';

@Controller('versions')
export class VersionController {
  constructor(private readonly versionService: VersionService) {}

  @Get()
  findAll() {
    return this.versionService.findAll();
  }

  @Get(':id/categories')
  findCategories(@Param('id', ParseIntPipe) id: number) {
    return this.versionService.findCategories(id);
  }
}
