import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { PlanEntity } from '../../common/entities/plan.entity';
import { User } from '../../auth/entities/user.entity';
import { FinishedProduct } from '../../finished-products/entities/finished-product.entity';

export enum ProductionStatus {
  COMPLETED = 'Completed',
  IN_PROCESS = 'In Process',
}

@Entity('productions')
@Index('idx_productions_exact_record', { synchronize: false })
@Check('quantity_produced > 0')
export class Production extends PlanEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'production_date', type: 'date' })
  productionDate!: string;

  @Column({ name: 'furniture_name', type: 'varchar', length: 100, nullable: true })
  furnitureName!: string | null;

  @Column({ name: 'quantity_produced', type: 'int' })
  quantityProduced!: number;

  @Column({
    name: 'production_status',
    type: 'simple-enum',
    enum: ProductionStatus,
  })
  productionStatus!: ProductionStatus;

  @OneToMany(() => FinishedProduct, (finishedProduct) => finishedProduct.production)
  finishedProducts!: FinishedProduct[];
}
