import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdminRegistrationBootstrap1720000000001
  implements MigrationInterface
{
  name = 'AdminRegistrationBootstrap1720000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key varchar(100) NOT NULL PRIMARY KEY,
        value varchar(20) NOT NULL
      )
    `);
    const setting = (await queryRunner.query(
      'SELECT key FROM system_settings WHERE key = ?',
      ['admin_registration_closed'],
    )) as { key: string }[];
    if (setting.length > 0) return;

    const administrators = (await queryRunner.query(
      "SELECT COUNT(*) AS count FROM users WHERE role = 'Administrator'",
    )) as { count: number }[];
    const value = Number(administrators[0]?.count ?? 0) > 0 ? 'true' : 'false';
    await queryRunner.query(
      'INSERT INTO system_settings (key, value) VALUES (?, ?)',
      ['admin_registration_closed', value],
    );
  }

  async down(): Promise<void> {
    throw new Error('The Administrator bootstrap migration is intentionally irreversible');
  }
}
