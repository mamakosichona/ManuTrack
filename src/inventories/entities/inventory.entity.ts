import { Check, Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { PlanEntity } from '../../common/entities/plan.entity';
import { RawMaterial } from '../../raw-materials/entities/raw-material.entity';

@Entity('inventories')
@Check('quantity_available >= 0')
export class Inventory extends PlanEntity {
  @OneToOne(() => RawMaterial, (rawMaterial) => rawMaterial.inventory, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'raw_material_id' })
  rawMaterial!: RawMaterial;

  @Column({
    name: 'quantity_available',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  quantityAvailable!: number;

  @Column({ name: 'last_updated', type: 'datetime' })
  lastUpdated!: Date;
}
