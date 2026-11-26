import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'alex.santos@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ minLength: 10, maxLength: 72 })
  @IsString()
  @MinLength(10)
  @MaxLength(72)
  password!: string;

  @ApiProperty({ example: 'Alex Santos' })
  @IsString()
  @Matches(/\S/)
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;
}
