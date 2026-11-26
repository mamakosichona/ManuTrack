import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateFinishedProductDto {
  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  productionId!: number;

  @ApiProperty({ example: 'Oak dining table' })
  @IsString()
  @Matches(/\S/)
  @MinLength(1)
  @MaxLength(100)
  productName!: string;

  @ApiProperty({ minimum: 0, example: 20 })
  @IsInt()
  @Min(0)
  quantityAvailable!: number;

  @ApiProperty({ example: '2026-10-24', format: 'date' })
  @IsDateString()
  dateCompleted!: string;
}
