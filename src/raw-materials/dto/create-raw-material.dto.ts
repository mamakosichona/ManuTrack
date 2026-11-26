import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateRawMaterialDto {
  @ApiProperty({ example: 'Kiln-dried oak boards' })
  @IsString()
  @Matches(/\S/)
  @MinLength(1)
  @MaxLength(100)
  materialName!: string;

  @ApiProperty({ example: 'board feet' })
  @IsString()
  @Matches(/\S/)
  @MinLength(1)
  @MaxLength(30)
  unit!: string;

  @ApiPropertyOptional({ example: 'Lumber for dining table tops' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string | null;
}
