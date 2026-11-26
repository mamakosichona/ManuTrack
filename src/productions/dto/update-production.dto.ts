import { PartialType, PickType } from '@nestjs/swagger';
import { CreateProductionDto } from './create-production.dto';

export class UpdateProductionDto extends PartialType(
  PickType(CreateProductionDto, [
    'productionDate',
    'furnitureName',
    'quantityProduced',
    'productionStatus',
  ] as const),
) {}
