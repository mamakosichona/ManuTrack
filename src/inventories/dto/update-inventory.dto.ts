import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Max, Min } from 'class-validator';

export class UpdateInventoryDto {
  @ApiProperty({ minimum: 0, maximum: 99999999.99, example: 120 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  quantityAvailable!: number;
}
