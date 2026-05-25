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
import { VersionService } from './version.service';

@Controller('versions')
export class VersionController {
  constructor(private readonly versionService: VersionService) {}

  @Get()
  findAll() {
    return this.versionService.findAll();
  }

  @Post()
  create(@Body('name') name: string) {
    return this.versionService.create(name);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body('name') name: string) {
    return this.versionService.update(id, name);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.versionService.remove(id);
  }

  @Patch(':id/toggle')
  toggleEnabled(@Param('id', ParseIntPipe) id: number) {
    return this.versionService.toggleEnabled(id);
  }

  @Get(':id/categories')
  findCategories(@Param('id', ParseIntPipe) id: number) {
    return this.versionService.findCategories(id);
  }
}
