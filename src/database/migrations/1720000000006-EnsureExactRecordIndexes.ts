import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureExactRecordIndexes1720000000006
  implements MigrationInterface
{
  name = 'EnsureExactRecordIndexes1720000000006';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (
      !(await queryRunner.hasTable('productions')) ||
      !(await queryRunner.hasTable('finished_products'))
    ) {
      throw new Error(
        'Cannot enforce unique production records without required tables',
      );
    }

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_productions_exact_record
      ON productions (
        user_id, production_date, lower(trim(furniture_name)),
        quantity_produced, production_status
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_finished_products_exact_record
      ON finished_products (
        production_id, lower(trim(product_name)),
        quantity_available, date_completed
      )
    `);
  }

  async down(): Promise<void> {
    throw new Error('Exact-record indexes cannot be safely reversed');
  }
}
