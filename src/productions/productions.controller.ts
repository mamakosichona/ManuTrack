import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../auth/entities/user.entity';
import { CreateProductionDto } from './dto/create-production.dto';
import { UpdateProductionDto } from './dto/update-production.dto';
import { ProductionsService } from './productions.service';

@ApiTags('Productions')
@ApiBearerAuth()
@Roles(UserRole.ADMINISTRATOR, UserRole.PRODUCTION_STAFF)
@Controller('productions')
export class ProductionsController {
  constructor(private readonly productionsService: ProductionsService) {}

  @Get()
  findAll() {
    return this.productionsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateProductionDto, @CurrentUser() user: User) {
    return this.productionsService.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductionDto,
    @CurrentUser() user: User,
  ) {
    return this.productionsService.update(id, dto, user);
  }

  @Delete(':id')
  delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.productionsService.delete(id, user);
  }
}
