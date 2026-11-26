import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ProductionStatus } from '../entities/production.entity';

export class CreateProductionDto {
  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  userId!: number;

  @ApiProperty({ example: '2026-10-24', format: 'date' })
  @IsDateString()
  productionDate!: string;

  @ApiProperty({ example: 'Oak dining table', maxLength: 100 })
  @IsString()
  @Matches(/\S/)
  @MinLength(1)
  @MaxLength(100)
  furnitureName!: string;

  @ApiProperty({ minimum: 1, example: 20 })
  @IsInt()
  @Min(1)
  quantityProduced!: number;

  @ApiProperty({ enum: ProductionStatus })
  @IsEnum(ProductionStatus)
  productionStatus!: ProductionStatus;
}
