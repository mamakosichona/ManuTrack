import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { User, UserRole } from '../auth/entities/user.entity';
import { CreateFinishedProductDto } from './dto/create-finished-product.dto';
import { UpdateFinishedProductDto } from './dto/update-finished-product.dto';
import { FinishedProduct } from './entities/finished-product.entity';
import { Production } from '../productions/entities/production.entity';

@Injectable()
export class FinishedProductsService {
  constructor(
    @InjectRepository(FinishedProduct)
    private readonly finishedProductsRepository: Repository<FinishedProduct>,
    @InjectRepository(Production)
    private readonly productionsRepository: Repository<Production>,
  ) {}

  findAll(): Promise<FinishedProduct[]> {
    return this.finishedProductsRepository.find({
      relations: { production: { user: true } },
      order: { dateCompleted: 'DESC', createdAt: 'DESC' },
    });
  }

  async create(
    dto: CreateFinishedProductDto,
    currentUser: User,
  ): Promise<FinishedProduct> {
    try {
      return await this.finishedProductsRepository.manager.transaction(
        async (manager) => {
          const finishedProducts = manager.getRepository(FinishedProduct);
          const production = await manager
            .getRepository(Production)
            .findOne({
              where: { id: dto.productionId },
              relations: { user: true },
            });
          if (!production) {
            throw new NotFoundException('Production record not found');
          }
          this.assertCanManage(production, currentUser);
          const productName = dto.productName.trim();
          await this.ensureUnique(finishedProducts, {
            productionId: production.id,
            productName,
            quantityAvailable: dto.quantityAvailable,
            dateCompleted: dto.dateCompleted,
          });
          return finishedProducts.save(
            finishedProducts.create({ ...dto, productName, production }),
          );
        },
      );
    } catch (error) {
      this.throwDuplicateConflict(error);
    }
  }

  async update(
    id: number,
    dto: UpdateFinishedProductDto,
    currentUser: User,
  ): Promise<FinishedProduct> {
    try {
      return await this.finishedProductsRepository.manager.transaction(
        async (manager) => {
          const finishedProducts = manager.getRepository(FinishedProduct);
          const finishedProduct = await finishedProducts.findOne({
            where: { id },
            relations: { production: { user: true } },
          });
          if (!finishedProduct) {
            throw new NotFoundException('Finished-furniture record not found');
          }
          this.assertCanManage(finishedProduct.production, currentUser);

          let production = finishedProduct.production;
          if (dto.productionId !== undefined && dto.productionId !== production.id) {
            const nextProduction = await manager
              .getRepository(Production)
              .findOne({
                where: { id: dto.productionId },
                relations: { user: true },
              });
            if (!nextProduction) {
              throw new NotFoundException('Production record not found');
            }
            this.assertCanManage(nextProduction, currentUser);
            production = nextProduction;
          }

          const productName =
            dto.productName?.trim() ?? finishedProduct.productName;
          const quantityAvailable =
            dto.quantityAvailable ?? finishedProduct.quantityAvailable;
          const dateCompleted = dto.dateCompleted ?? finishedProduct.dateCompleted;
          await this.ensureUnique(
            finishedProducts,
            {
              productionId: production.id,
              productName,
              quantityAvailable,
              dateCompleted,
            },
            id,
          );

          finishedProduct.production = production;
          finishedProduct.productName = productName;
          finishedProduct.quantityAvailable = quantityAvailable;
          finishedProduct.dateCompleted = dateCompleted;
          return finishedProducts.save(finishedProduct);
        },
      );
    } catch (error) {
      this.throwDuplicateConflict(error);
    }
  }

  async delete(id: number, currentUser: User): Promise<void> {
    const finishedProduct = await this.finishedProductsRepository.findOne({
      where: { id },
      relations: { production: { user: true } },
    });
    if (!finishedProduct) {
      throw new NotFoundException('Finished-furniture record not found');
    }
    this.assertCanManage(finishedProduct.production, currentUser);
    await this.finishedProductsRepository.remove(finishedProduct);
  }

  private async ensureUnique(
    finishedProducts: Repository<FinishedProduct>,
    values: {
      productionId: number;
      productName: string;
      quantityAvailable: number;
      dateCompleted: string;
    },
    excludeId?: number,
  ): Promise<void> {
    const query = finishedProducts
      .createQueryBuilder('finishedProduct')
      .innerJoin('finishedProduct.production', 'production')
      .where('production.id = :productionId', {
        productionId: values.productionId,
      })
      .andWhere('LOWER(TRIM(finishedProduct.productName)) = :productName', {
        productName: values.productName.trim().toLowerCase(),
      })
      .andWhere('finishedProduct.quantityAvailable = :quantityAvailable', {
        quantityAvailable: values.quantityAvailable,
      })
      .andWhere('finishedProduct.dateCompleted = :dateCompleted', {
        dateCompleted: values.dateCompleted,
      });
    if (excludeId !== undefined) {
      query.andWhere('finishedProduct.id != :excludeId', { excludeId });
    }
    if (await query.getOne()) {
      throw new ConflictException(
        'An identical finished-furniture record already exists',
      );
    }
  }

  private assertCanManage(production: Production, currentUser: User): void {
    if (
      currentUser.role !== UserRole.ADMINISTRATOR &&
      production.user.id !== currentUser.id
    ) {
      throw new ForbiddenException(
        'Finished-furniture records can only be managed by the production owner',
      );
    }
  }

  private throwDuplicateConflict(error: unknown): never {
    if (
      error instanceof QueryFailedError &&
      error.message.includes('idx_finished_products_exact_record')
    ) {
      throw new ConflictException(
        'An identical finished-furniture record already exists',
      );
    }
    throw error;
  }
}
