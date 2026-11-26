import { MigrationInterface, QueryRunner } from 'typeorm';

export class PlanAlignment1720000000000 implements MigrationInterface {
  name = 'PlanAlignment1720000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await this.migrateUsers(queryRunner);
    await this.createRawMaterialInventory(queryRunner);
    await this.createProductionTables(queryRunner);
  }

  async down(): Promise<void> {
    throw new Error('The plan-alignment migration is intentionally irreversible');
  }

  private async migrateUsers(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('users'))) {
      await queryRunner.query(this.usersTableSql('users'));
      return;
    }

    const columns = (await queryRunner.query('PRAGMA table_info("users")')) as {
      name: string;
    }[];
    if (columns.some((column) => column.name === 'username')) return;

    const legacyUsers = (await queryRunner.query(
      'SELECT id, email, password_hash, full_name, role, created_at, updated_at FROM users',
    )) as Record<string, unknown>[];
    await queryRunner.query(this.usersTableSql('users_plan'));

    const usernames = new Set<string>();
    for (const legacyUser of legacyUsers) {
      const email = String(legacyUser.email ?? '');
      const userId = String(legacyUser.id);
      const localPart = email.split('@')[0] || 'user';
      const base =
        localPart.toLowerCase().replace(/[^a-z0-9._-]/g, '-').slice(0, 90) ||
        `user-${userId.slice(0, 8)}`;
      let username = base;
      if (usernames.has(username)) username = `${base}-${userId.slice(0, 8)}`;
      usernames.add(username);
      const role =
        legacyUser.role === 'admin'
          ? 'Administrator'
          : 'Inventory Staff';
      await queryRunner.query(
        'INSERT INTO users_plan (email, legacy_username, password_hash, full_name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          email.toLowerCase() || null,
          username,
          String(legacyUser.password_hash ?? ''),
          String(legacyUser.full_name ?? username),
          role,
          String(legacyUser.created_at ?? new Date().toISOString()),
          String(legacyUser.updated_at ?? new Date().toISOString()),
        ],
      );
    }

    await queryRunner.query('DROP TABLE users');
    await queryRunner.query('ALTER TABLE users_plan RENAME TO users');
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_legacy_username ON users (legacy_username)',
    );
  }

  private async createRawMaterialInventory(queryRunner: QueryRunner): Promise<void> {
    const hadRawMaterials = await queryRunner.hasTable('raw_materials');
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS raw_materials (
        id integer PRIMARY KEY AUTOINCREMENT,
        material_name varchar(100) NOT NULL,
        unit varchar(30) NOT NULL,
        description varchar(255) NULL,
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS inventories (
        id integer PRIMARY KEY AUTOINCREMENT,
        raw_material_id integer NOT NULL UNIQUE,
        quantity_available decimal(10,2) NOT NULL DEFAULT 0
          CHECK (quantity_available >= 0),
        last_updated datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (raw_material_id) REFERENCES raw_materials (id)
          ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    if (!hadRawMaterials && (await queryRunner.hasTable('materials'))) {
      const materials = (await queryRunner.query(
        'SELECT id, name, unit_of_measure, quantity_on_hand, created_at, updated_at FROM materials',
      )) as Record<string, unknown>[];
      for (const material of materials) {
        const createdAt = String(material.created_at ?? new Date().toISOString());
        const updatedAt = String(material.updated_at ?? createdAt);
        await queryRunner.query(
          'INSERT INTO raw_materials (material_name, unit, description, created_at, updated_at) VALUES (?, ?, NULL, ?, ?)',
          [
            String(material.name ?? 'Unnamed material'),
            String(material.unit_of_measure ?? 'unit'),
            createdAt,
            updatedAt,
          ],
        );
        const insertedMaterial = (await queryRunner.query(
          'SELECT last_insert_rowid() AS id',
        )) as { id: number }[];
        const id = Number(insertedMaterial[0].id);
        await queryRunner.query(
          'INSERT INTO inventories (raw_material_id, quantity_available, last_updated, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
          [
            id,
            Number(material.quantity_on_hand ?? 0),
            updatedAt,
            createdAt,
            updatedAt,
          ],
        );
      }
    }
  }

  private async createProductionTables(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS productions (
        id integer PRIMARY KEY AUTOINCREMENT,
        user_id integer NOT NULL,
        production_date date NOT NULL,
        quantity_produced integer NOT NULL CHECK (quantity_produced > 0),
        production_status varchar(50) NOT NULL
          CHECK (production_status IN ('Completed', 'In Process')),
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
          ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS finished_products (
        id integer PRIMARY KEY AUTOINCREMENT,
        production_id integer NOT NULL,
        product_name varchar(100) NOT NULL,
        quantity_available integer NOT NULL CHECK (quantity_available >= 0),
        date_completed date NOT NULL,
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (production_id) REFERENCES productions (id)
          ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_productions_user_id ON productions (user_id)',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_finished_products_production_id ON finished_products (production_id)',
    );
  }

  private usersTableSql(tableName: string): string {
    return `
      CREATE TABLE ${tableName} (
        id integer PRIMARY KEY AUTOINCREMENT,
        email varchar(255) NULL UNIQUE,
        legacy_username varchar(255) NOT NULL UNIQUE,
        password_hash varchar(255) NOT NULL,
        full_name varchar(100) NOT NULL,
        role varchar(50) NOT NULL
          CHECK (role IN ('Administrator', 'Inventory Staff', 'Production Staff')),
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
  }
}
