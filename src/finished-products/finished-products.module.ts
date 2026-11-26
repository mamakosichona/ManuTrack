import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinishedProduct } from './entities/finished-product.entity';
import { FinishedProductsController } from './finished-products.controller';
import { FinishedProductsService } from './finished-products.service';
import { Production } from '../productions/entities/production.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FinishedProduct, Production])],
  controllers: [FinishedProductsController],
  providers: [FinishedProductsService],
})
export class FinishedProductsModule {}
