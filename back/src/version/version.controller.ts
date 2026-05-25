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
import type { CreateVersionDto } from './dto/create-version.dto';
import type { UpdateVersionDto } from './dto/update-version.dto';
import { VersionService } from './version.service';

@Controller('versions')
export class VersionController {
  constructor(private readonly versionService: VersionService) {}

  @Get()
  findAll() {
    return this.versionService.findAll();
  }

  @Post()
  create(@Body() body: CreateVersionDto) {
    return this.versionService.create(body);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateVersionDto) {
    return this.versionService.update(id, body);
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
