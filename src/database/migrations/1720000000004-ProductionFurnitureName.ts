import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductionFurnitureName1720000000004
  implements MigrationInterface
{
  name = 'ProductionFurnitureName1720000000004';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('productions'))) {
      throw new Error('Cannot add furniture names without a productions table');
    }

    const columns = (await queryRunner.query(
      'PRAGMA table_info("productions")',
    )) as { name: string }[];
    if (columns.some((column) => column.name === 'furniture_name')) return;

    await queryRunner.query(
      'ALTER TABLE productions ADD COLUMN furniture_name varchar(100) NULL',
    );
  }

  async down(): Promise<void> {
    throw new Error('Production furniture names cannot be safely removed');
  }
}
