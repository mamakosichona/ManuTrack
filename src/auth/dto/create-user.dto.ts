import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { RegisterDto } from './register.dto';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto extends RegisterDto {
  @ApiProperty({ enum: UserRole, default: UserRole.INVENTORY_STAFF })
  @IsEnum(UserRole)
  role!: UserRole;
}
