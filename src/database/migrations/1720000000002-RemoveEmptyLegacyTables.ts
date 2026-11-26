import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveEmptyLegacyTables1720000000002
  implements MigrationInterface
{
  name = 'RemoveEmptyLegacyTables1720000000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tables = ['production_orders', 'products', 'materials', 'suppliers'];
    for (const table of tables) {
      if (!(await queryRunner.hasTable(table))) continue;
      const rows = (await queryRunner.query(
        `SELECT COUNT(*) AS count FROM "${table}"`,
      )) as { count: number }[];
      if (Number(rows[0]?.count ?? 0) > 0) {
        throw new Error(
          `Legacy table "${table}" contains data and was not removed; back it up and migrate it before retrying.`,
        );
      }
    }

    for (const table of tables) {
      if (await queryRunner.hasTable(table)) {
        await queryRunner.query(`DROP TABLE "${table}"`);
      }
    }
  }

  async down(): Promise<void> {
    throw new Error('Removed legacy tables cannot be restored by this migration');
  }
}
