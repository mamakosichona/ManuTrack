import {
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from './entities/system-setting.entity';
import { User, UserRole } from './entities/user.entity';

type UserInput = { email: string; passwordHash: string; fullName: string };
type UserChanges = {
  email?: string;
  fullName?: string;
  role?: UserRole;
};
type PublicUser = Omit<User, 'passwordHash' | 'legacyUsername'>;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async registerFirstAdministrator(input: UserInput): Promise<User> {
    return this.usersRepository.manager.transaction(async (manager) => {
      const users = manager.getRepository(User);
      const settings = manager.getRepository(SystemSetting);
      const bootstrapSetting = await settings.findOneBy({
        key: 'admin_registration_closed',
      });
      if (!bootstrapSetting) {
        throw new InternalServerErrorException(
          'Administrator bootstrap state is not initialized',
        );
      }
      if (bootstrapSetting.value === 'true') {
        throw new ForbiddenException('Public registration is closed');
      }
      const user = await this.createWithRepository(
        users,
        input,
        UserRole.ADMINISTRATOR,
      );
      bootstrapSetting.value = 'true';
      await settings.save(bootstrapSetting);
      return user;
    });
  }

  async create(input: UserInput, role: UserRole): Promise<User> {
    return this.createWithRepository(this.usersRepository, input, role);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('LOWER(user.email) = :email', { email: this.normalizeEmail(email) })
      .getOne();
  }

  findById(id: number): Promise<User | null> {
    return this.usersRepository.findOneBy({ id });
  }

  async getOne(id: number): Promise<PublicUser> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return this.toPublicUser(user);
  }

  async list(): Promise<PublicUser[]> {
    const users = await this.usersRepository.find({
      order: { createdAt: 'DESC' },
    });
    return users.map((user) => this.toPublicUser(user));
  }

  async update(
    id: number,
    changes: UserChanges,
  ): Promise<PublicUser> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    if (changes.email !== undefined) {
      const email = this.normalizeEmail(changes.email);
      const duplicate = await this.usersRepository.existsBy({ email });
      if (duplicate && email !== user.email) {
        throw new ConflictException('Email address already exists');
      }
      user.email = email;
    }
    if (changes.fullName !== undefined) user.fullName = changes.fullName.trim();
    if (changes.role !== undefined) user.role = changes.role;
    return this.toPublicUser(await this.usersRepository.save(user));
  }

  private async createWithRepository(
    users: Repository<User>,
    input: UserInput,
    role: UserRole,
  ): Promise<User> {
    const email = this.normalizeEmail(input.email);
    if (await users.existsBy({ email })) {
      throw new ConflictException('Email address already exists');
    }
    return users.save(
      users.create({
        ...input,
        email,
        legacyUsername: email,
        fullName: input.fullName.trim(),
        role,
      }),
    );
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private toPublicUser(user: User): PublicUser {
    const {
      legacyUsername: _legacyUsername,
      passwordHash: _passwordHash,
      ...publicUser
    } = user;
    return publicUser;
  }
}
