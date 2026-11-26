import { Column, Entity, Index } from 'typeorm';
import { PlanEntity } from '../../common/entities/plan.entity';

export enum UserRole {
  ADMINISTRATOR = 'Administrator',
  INVENTORY_STAFF = 'Inventory Staff',
  PRODUCTION_STAFF = 'Production Staff',
}

@Entity('users')
export class User extends PlanEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string | null;

  @Column({ name: 'password_hash', select: false, length: 255 })
  passwordHash!: string;

  @Column({ name: 'full_name', length: 100 })
  fullName!: string;

  @Column({
    type: 'simple-enum',
    enum: UserRole,
    default: UserRole.INVENTORY_STAFF,
  })
  role!: UserRole;

  @Index({ unique: true })
  @Column({ name: 'legacy_username', length: 255, select: false })
  legacyUsername!: string;
}
