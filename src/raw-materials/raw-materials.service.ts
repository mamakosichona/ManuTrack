import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Inventory } from '../inventories/entities/inventory.entity';
import { CreateRawMaterialDto } from './dto/create-raw-material.dto';
import { UpdateRawMaterialDto } from './dto/update-raw-material.dto';
import { RawMaterial } from './entities/raw-material.entity';

@Injectable()
export class RawMaterialsService {
  constructor(
    @InjectRepository(RawMaterial)
    private readonly rawMaterialsRepository: Repository<RawMaterial>,
    private readonly dataSource: DataSource,
  ) {}

  findAll(): Promise<RawMaterial[]> {
    return this.rawMaterialsRepository.find({
      relations: { inventory: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<RawMaterial> {
    const material = await this.rawMaterialsRepository.findOne({
      where: { id },
      relations: { inventory: true },
    });
    if (!material) throw new NotFoundException('Raw material not found');
    return material;
  }

  async create(dto: CreateRawMaterialDto): Promise<RawMaterial> {
    const id = await this.dataSource.transaction(async (manager) => {
      const materials = manager.getRepository(RawMaterial);
      const inventories = manager.getRepository(Inventory);
      const material = await materials.save(
        materials.create({
          ...dto,
          materialName: dto.materialName.trim(),
          unit: dto.unit.trim(),
          description: dto.description?.trim() || null,
        }),
      );
      await inventories.save(
        inventories.create({
          rawMaterial: material,
          quantityAvailable: 0,
          lastUpdated: new Date(),
        }),
      );
      return material.id;
    });
    return this.findOne(id);
  }

  async update(id: number, dto: UpdateRawMaterialDto): Promise<RawMaterial> {
    const material = await this.findOne(id);
    if (dto.materialName !== undefined) material.materialName = dto.materialName.trim();
    if (dto.unit !== undefined) material.unit = dto.unit.trim();
    if (dto.description !== undefined) material.description = dto.description?.trim() || null;
    return this.rawMaterialsRepository.save(material);
  }
}
