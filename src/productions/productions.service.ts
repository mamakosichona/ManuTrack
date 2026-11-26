import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { User, UserRole } from '../auth/entities/user.entity';
import { UsersService } from '../auth/users.service';
import { CreateProductionDto } from './dto/create-production.dto';
import { UpdateProductionDto } from './dto/update-production.dto';
import { Production } from './entities/production.entity';

@Injectable()
export class ProductionsService {
  constructor(
    @InjectRepository(Production)
    private readonly productionsRepository: Repository<Production>,
    private readonly usersService: UsersService,
  ) {}

  findAll(): Promise<Production[]> {
    return this.productionsRepository.find({
      relations: { user: true },
      order: { productionDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async create(dto: CreateProductionDto, currentUser: User): Promise<Production> {
    this.assertCanAssign(dto.userId, currentUser);
    const user = await this.usersService.findById(dto.userId);
    if (!user) throw new NotFoundException('User not found');

    try {
      return await this.productionsRepository.manager.transaction(
        async (manager) => {
          const productions = manager.getRepository(Production);
          const productionData = {
            productionDate: dto.productionDate,
            furnitureName: dto.furnitureName.trim(),
            quantityProduced: dto.quantityProduced,
            productionStatus: dto.productionStatus,
            userId: user.id,
          };
          await this.ensureUnique(productions, productionData);
          return productions.save(
            productions.create({ ...dto, furnitureName: productionData.furnitureName, user }),
          );
        },
      );
    } catch (error) {
      this.throwDuplicateConflict(error);
    }
  }

  async update(
    id: number,
    dto: UpdateProductionDto,
    currentUser: User,
  ): Promise<Production> {
    try {
      return await this.productionsRepository.manager.transaction(
        async (manager) => {
          const productions = manager.getRepository(Production);
          const production = await productions.findOne({
            where: { id },
            relations: { user: true },
          });
          if (!production) throw new NotFoundException('Production record not found');
          this.assertCanManage(production, currentUser);

          const productionDate = dto.productionDate ?? production.productionDate;
          const furnitureName =
            dto.furnitureName?.trim() ?? production.furnitureName;
          const quantityProduced =
            dto.quantityProduced ?? production.quantityProduced;
          const productionStatus =
            dto.productionStatus ?? production.productionStatus;
          await this.ensureUnique(
            productions,
            {
              productionDate,
              furnitureName,
              quantityProduced,
              productionStatus,
              userId: production.user.id,
            },
            id,
          );

          production.productionDate = productionDate;
          production.furnitureName = furnitureName;
          production.quantityProduced = quantityProduced;
          production.productionStatus = productionStatus;
          return productions.save(production);
        },
      );
    } catch (error) {
      this.throwDuplicateConflict(error);
    }
  }

  async delete(id: number, currentUser: User): Promise<void> {
    await this.productionsRepository.manager.transaction(async (manager) => {
      const productions = manager.getRepository(Production);
      const production = await productions.findOne({
        where: { id },
        relations: { user: true, finishedProducts: true },
      });
      if (!production) throw new NotFoundException('Production record not found');
      this.assertCanManage(production, currentUser);
      if (production.finishedProducts.length > 0) {
        throw new ConflictException(
          'Delete linked finished-furniture records before deleting this production record',
        );
      }
      await productions.remove(production);
    });
  }

  private async ensureUnique(
    productions: Repository<Production>,
    values: {
      productionDate: string;
      furnitureName: string | null;
      quantityProduced: number;
      productionStatus: Production['productionStatus'];
      userId: number;
    },
    excludeId?: number,
  ): Promise<void> {
    if (!values.furnitureName) return;
    const query = productions
      .createQueryBuilder('production')
      .innerJoin('production.user', 'productionUser')
      .where('productionUser.id = :userId', { userId: values.userId })
      .andWhere('production.productionDate = :productionDate', {
        productionDate: values.productionDate,
      })
      .andWhere('LOWER(TRIM(production.furnitureName)) = :furnitureName', {
        furnitureName: values.furnitureName.trim().toLowerCase(),
      })
      .andWhere('production.quantityProduced = :quantityProduced', {
        quantityProduced: values.quantityProduced,
      })
      .andWhere('production.productionStatus = :productionStatus', {
        productionStatus: values.productionStatus,
      });
    if (excludeId !== undefined) {
      query.andWhere('production.id != :excludeId', { excludeId });
    }
    if (await query.getOne()) {
      throw new ConflictException('An identical production record already exists');
    }
  }

  private assertCanAssign(userId: number, currentUser: User): void {
    if (
      currentUser.role !== UserRole.ADMINISTRATOR &&
      currentUser.id !== userId
    ) {
      throw new ForbiddenException(
        'Production records must be assigned to the signed-in user',
      );
    }
  }

  private assertCanManage(production: Production, currentUser: User): void {
    this.assertCanAssign(production.user.id, currentUser);
  }

  private throwDuplicateConflict(error: unknown): never {
    if (
      error instanceof QueryFailedError &&
      error.message.includes('idx_productions_exact_record')
    ) {
      throw new ConflictException('An identical production record already exists');
    }
    throw error;
  }
}
