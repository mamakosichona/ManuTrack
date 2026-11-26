import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { PlanEntity } from '../../common/entities/plan.entity';
import { Production } from '../../productions/entities/production.entity';

@Entity('finished_products')
@Index('idx_finished_products_exact_record', { synchronize: false })
@Check('quantity_available >= 0')
export class FinishedProduct extends PlanEntity {
  @ManyToOne(() => Production, (production) => production.finishedProducts, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'production_id' })
  production!: Production;

  @Column({ name: 'product_name', length: 100 })
  productName!: string;

  @Column({ name: 'quantity_available', type: 'int' })
  quantityAvailable!: number;

  @Column({ name: 'date_completed', type: 'date' })
  dateCompleted!: string;
}
