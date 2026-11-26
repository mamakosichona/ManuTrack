import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { User, UserRole } from './entities/user.entity';
import { UsersService } from './users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    this.validatePasswordLength(dto.password);
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.usersService.registerFirstAdministrator({
      email: dto.email,
      fullName: dto.fullName.trim(),
      passwordHash,
    });
    return this.toPublicUser(user);
  }

  async createUser(dto: CreateUserDto) {
    this.validatePasswordLength(dto.password);
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.usersService.create(
      {
        email: dto.email,
        fullName: dto.fullName,
        passwordHash,
      },
      dto.role ?? UserRole.INVENTORY_STAFF,
    );
    return this.toPublicUser(user);
  }

  async login(dto: LoginDto) {
    this.validatePasswordLength(dto.password);
    const user = await this.usersService.findByEmail(dto.email);
    const passwordMatches =
      user && (await bcrypt.compare(dto.password, user.passwordHash));
    if (!user || !user.email || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: '1h',
      user: this.toPublicUser(user),
    };
  }

  me(user: User) {
    return this.toPublicUser(user);
  }

  private toPublicUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private validatePasswordLength(password: string): void {
    if (Buffer.byteLength(password, 'utf8') > 72) {
      throw new BadRequestException('Password must be at most 72 UTF-8 bytes');
    }
  }
}
