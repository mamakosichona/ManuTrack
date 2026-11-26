import { Column, Entity, OneToOne } from 'typeorm';
import { PlanEntity } from '../../common/entities/plan.entity';
import { Inventory } from '../../inventories/entities/inventory.entity';

@Entity('raw_materials')
export class RawMaterial extends PlanEntity {
  @Column({ name: 'material_name', length: 100 })
  materialName!: string;

  @Column({ length: 30 })
  unit!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @OneToOne(() => Inventory, (inventory) => inventory.rawMaterial)
  inventory!: Inventory | null;
}
