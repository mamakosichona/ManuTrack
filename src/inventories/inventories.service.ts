import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { Inventory } from './entities/inventory.entity';

@Injectable()
export class InventoriesService {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoriesRepository: Repository<Inventory>,
  ) {}

  findAll(): Promise<Inventory[]> {
    return this.inventoriesRepository.find({
      relations: { rawMaterial: true },
      order: { lastUpdated: 'DESC' },
    });
  }

  async update(id: number, dto: UpdateInventoryDto): Promise<Inventory> {
    const inventory = await this.inventoriesRepository.findOne({
      where: { id },
      relations: { rawMaterial: true },
    });
    if (!inventory) throw new NotFoundException('Inventory record not found');
    inventory.quantityAvailable = dto.quantityAvailable;
    inventory.lastUpdated = new Date();
    return this.inventoriesRepository.save(inventory);
  }
}
