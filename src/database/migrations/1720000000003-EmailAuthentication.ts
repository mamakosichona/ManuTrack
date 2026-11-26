import { MigrationInterface, QueryRunner } from 'typeorm';

export class EmailAuthentication1720000000003 implements MigrationInterface {
  name = 'EmailAuthentication1720000000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('users'))) {
      throw new Error('Cannot enable email authentication without a users table');
    }

    const columns = (await queryRunner.query('PRAGMA table_info("users")')) as {
      name: string;
    }[];
    if (!columns.some((column) => column.name === 'email')) {
      await queryRunner.query('ALTER TABLE users ADD COLUMN email varchar(255) NULL');
    }
    if (
      columns.some((column) => column.name === 'username') &&
      !columns.some((column) => column.name === 'legacy_username')
    ) {
      await queryRunner.query('DROP INDEX IF EXISTS idx_users_username');
      await queryRunner.query(
        'ALTER TABLE users RENAME COLUMN username TO legacy_username',
      );
    }
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email)',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_legacy_username ON users (legacy_username)',
    );
  }

  async down(): Promise<void> {
    throw new Error('Email authentication migration cannot be reversed safely');
  }
}
