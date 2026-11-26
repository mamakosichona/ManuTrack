import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExactRecordPrevention1720000000005
  implements MigrationInterface
{
  name = 'ExactRecordPrevention1720000000005';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (
      !(await queryRunner.hasTable('productions')) ||
      !(await queryRunner.hasTable('finished_products'))
    ) {
      throw new Error(
        'Cannot prevent duplicate records without production and finished-furniture tables',
      );
    }

    const productionDuplicates = (await queryRunner.query(`
      SELECT COUNT(*) AS count
      FROM (
        SELECT user_id, production_date, lower(trim(furniture_name)),
          quantity_produced, production_status
        FROM productions
        WHERE furniture_name IS NOT NULL
        GROUP BY user_id, production_date, lower(trim(furniture_name)),
          quantity_produced, production_status
        HAVING COUNT(*) > 1
      )
    `)) as { count: number }[];
    if (Number(productionDuplicates[0]?.count ?? 0) > 0) {
      throw new Error(
        'Cannot prevent duplicate production records because exact duplicates already exist',
      );
    }

    await queryRunner.query(`
      DELETE FROM finished_products
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM finished_products
        GROUP BY production_id, lower(trim(product_name)),
          quantity_available, date_completed
      )
    `);

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
    throw new Error('Exact-record prevention cannot be safely reversed');
  }
}
