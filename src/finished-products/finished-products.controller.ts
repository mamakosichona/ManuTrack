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
import { CreateFinishedProductDto } from './dto/create-finished-product.dto';
import { UpdateFinishedProductDto } from './dto/update-finished-product.dto';
import { FinishedProductsService } from './finished-products.service';

@ApiTags('Finished furniture')
@ApiBearerAuth()
@Controller('finished-products')
export class FinishedProductsController {
  constructor(private readonly finishedProductsService: FinishedProductsService) {}

  @Get()
  findAll() {
    return this.finishedProductsService.findAll();
  }

  @Post()
  @Roles(UserRole.ADMINISTRATOR, UserRole.PRODUCTION_STAFF)
  create(
    @Body() dto: CreateFinishedProductDto,
    @CurrentUser() user: User,
  ) {
    return this.finishedProductsService.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRATOR, UserRole.PRODUCTION_STAFF)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFinishedProductDto,
    @CurrentUser() user: User,
  ) {
    return this.finishedProductsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMINISTRATOR, UserRole.PRODUCTION_STAFF)
  delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.finishedProductsService.delete(id, user);
  }
}
