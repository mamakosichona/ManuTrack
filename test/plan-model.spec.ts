import { DataSource } from 'typeorm';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { User, UserRole } from '../src/auth/entities/user.entity';
import { SystemSetting } from '../src/auth/entities/system-setting.entity';
import { UsersService } from '../src/auth/users.service';
import { Inventory } from '../src/inventories/entities/inventory.entity';
import { RawMaterial } from '../src/raw-materials/entities/raw-material.entity';
import { RawMaterialsService } from '../src/raw-materials/raw-materials.service';
import { Production, ProductionStatus } from '../src/productions/entities/production.entity';
import { ProductionsService } from '../src/productions/productions.service';
import { FinishedProduct } from '../src/finished-products/entities/finished-product.entity';
import { FinishedProductsService } from '../src/finished-products/finished-products.service';
import { PlanAlignment1720000000000 } from '../src/database/migrations/1720000000000-PlanAlignment';
import { AdminRegistrationBootstrap1720000000001 } from '../src/database/migrations/1720000000001-AdminRegistrationBootstrap';
import { RemoveEmptyLegacyTables1720000000002 } from '../src/database/migrations/1720000000002-RemoveEmptyLegacyTables';
import { EmailAuthentication1720000000003 } from '../src/database/migrations/1720000000003-EmailAuthentication';
import { ProductionFurnitureName1720000000004 } from '../src/database/migrations/1720000000004-ProductionFurnitureName';
import { ExactRecordPrevention1720000000005 } from '../src/database/migrations/1720000000005-ExactRecordPrevention';
import { EnsureExactRecordIndexes1720000000006 } from '../src/database/migrations/1720000000006-EnsureExactRecordIndexes';

describe('plan-aligned data model', () => {
  let dataSource: DataSource;

  beforeEach(async () => {
    dataSource = new DataSource({
      type: 'sqljs',
      entities: [User, SystemSetting, RawMaterial, Inventory, Production, FinishedProduct],
      synchronize: true,
    });
    await dataSource.initialize();
    await dataSource.getRepository(SystemSetting).save({
      key: 'admin_registration_closed',
      value: 'false',
    });
  });

  afterEach(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('creates a linked inventory row whenever a raw material is added', async () => {
    const rawMaterials = new RawMaterialsService(
      dataSource.getRepository(RawMaterial),
      dataSource,
    );

    const material = await rawMaterials.create({
      materialName: 'Kiln-dried oak boards',
      unit: 'board feet',
      description: 'Lumber for table tops',
    });

    expect(material.id).toEqual(expect.any(Number));
    expect(material.inventory?.quantityAvailable).toBe(0);
    expect(await dataSource.getRepository(Inventory).count()).toBe(1);
  });

  it('records production and associates finished products with it', async () => {
    const users = new UsersService(dataSource.getRepository(User));
    const user = await users.registerFirstAdministrator({
      email: 'admin@example.com',
      fullName: 'Alex Santos',
      passwordHash: 'hash',
    });
    const productions = new ProductionsService(
      dataSource.getRepository(Production),
      users,
    );
    const production = await productions.create(
      {
        userId: user.id,
        productionDate: '2026-10-24',
        furnitureName: 'Oak dining table',
        quantityProduced: 20,
        productionStatus: ProductionStatus.COMPLETED,
      },
      user,
    );
    expect(production.furnitureName).toBe('Oak dining table');
    await expect(
      productions.create(
        {
          userId: user.id,
          productionDate: '2026-10-24',
          furnitureName: ' oak dining table ',
          quantityProduced: 20,
          productionStatus: ProductionStatus.COMPLETED,
        },
        user,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    const finishedProducts = new FinishedProductsService(
      dataSource.getRepository(FinishedProduct),
      dataSource.getRepository(Production),
    );

    const finishedInput = {
      productionId: production.id,
      productName: 'Oak dining table',
      quantityAvailable: 20,
      dateCompleted: '2026-10-24',
    };
    const finished = await finishedProducts.create(finishedInput, user);
    await expect(
      finishedProducts.create(finishedInput, user),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(finished.production.id).toBe(production.id);
    expect(finished.productName).toBe('Oak dining table');
    const updatedProduction = await productions.update(
      production.id,
      { quantityProduced: 21 },
      user,
    );
    expect(updatedProduction.quantityProduced).toBe(21);
    await expect(
      productions.delete(production.id, user),
    ).rejects.toBeInstanceOf(ConflictException);
    const updatedFinished = await finishedProducts.update(
      finished.id,
      { quantityAvailable: 18 },
      user,
    );
    expect(updatedFinished.quantityAvailable).toBe(18);
    await finishedProducts.delete(finished.id, user);
    await productions.delete(production.id, user);
    expect(user.role).toBe(UserRole.ADMINISTRATOR);
    await expect(
      users.registerFirstAdministrator({
        email: 'second.admin@example.com',
        fullName: 'Second Admin',
        passwordHash: 'hash',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await users.update(user.id, { role: UserRole.INVENTORY_STAFF });
    await expect(
      users.registerFirstAdministrator({
        email: 'replacement.admin@example.com',
        fullName: 'Replacement Admin',
        passwordHash: 'hash',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects negative inventory quantities at the database constraint', async () => {
    const material = await dataSource.getRepository(RawMaterial).save({
      materialName: 'Plywood sheets',
      unit: 'sheets',
      description: null,
    });
    const inventories = dataSource.getRepository(Inventory);
    await expect(
      inventories.save(
        inventories.create({
          rawMaterial: material,
          quantityAvailable: -1,
          lastUpdated: new Date(),
        }),
      ),
    ).rejects.toThrow();
    expect(material.id).toEqual(expect.any(Number));
  });

  it('migrates legacy usernames, roles, and material stock without discarding legacy records', async () => {
    const legacy = new DataSource({ type: 'sqljs' });
    await legacy.initialize();
    const runner = legacy.createQueryRunner();
    await runner.connect();
    await runner.query(`
      CREATE TABLE users (
        id varchar(36) NOT NULL PRIMARY KEY,
        email varchar(255) NOT NULL UNIQUE,
        password_hash varchar(255) NOT NULL,
        full_name varchar(120) NOT NULL,
        role varchar(9) NOT NULL CHECK (role IN ('admin', 'operator')),
        created_at datetime NOT NULL,
        updated_at datetime NOT NULL
      )
    `);
    await runner.query(`
      INSERT INTO users VALUES
      ('legacy-user-id', 'alex.santos@example.com', 'saved-hash', 'Alex Santos',
        'operator', '2026-01-01', '2026-01-01')
    `);
    await runner.query(`
      CREATE TABLE materials (
        id varchar(36) NOT NULL PRIMARY KEY,
        name varchar(160) NOT NULL,
        unit_of_measure varchar(24) NOT NULL,
        quantity_on_hand integer NOT NULL,
        created_at datetime NOT NULL,
        updated_at datetime NOT NULL
      )
    `);
    await runner.query(`
      INSERT INTO materials VALUES
      ('legacy-material-id', 'Oak boards', 'board feet', 12, '2026-01-01', '2026-01-02')
    `);
    await runner.query('CREATE TABLE production_orders (id varchar(36) PRIMARY KEY)');

    await new PlanAlignment1720000000000().up(runner);
    await new AdminRegistrationBootstrap1720000000001().up(runner);
    await new EmailAuthentication1720000000003().up(runner);

    const migratedUsers = (await runner.query(
      'SELECT id, email, legacy_username, role, password_hash FROM users',
    )) as {
      id: number;
      email: string;
      legacy_username: string;
      role: string;
      password_hash: string;
    }[];
    const migratedInventory = (await runner.query(`
      SELECT raw_materials.material_name, inventories.quantity_available
      FROM inventories JOIN raw_materials ON raw_materials.id = inventories.raw_material_id
    `)) as { material_name: string; quantity_available: number }[];
    expect(migratedUsers[0]).toMatchObject({
      email: 'alex.santos@example.com',
      legacy_username: 'alex.santos',
      role: 'Inventory Staff',
      password_hash: 'saved-hash',
    });

    expect(typeof migratedUsers[0].id).toBe('number');
    const bootstrapState = (await runner.query(
      "SELECT value FROM system_settings WHERE key = 'admin_registration_closed'",
    )) as { value: string }[];
    expect(bootstrapState[0].value).toBe('false');
    expect(migratedInventory[0]).toMatchObject({
      material_name: 'Oak boards',
      quantity_available: 12,
    });
    expect(await runner.hasTable('production_orders')).toBe(true);

    await runner.release();
    await legacy.destroy();
  });

  it('adds email login without losing legacy account usernames', async () => {
    const legacy = new DataSource({ type: 'sqljs' });
    await legacy.initialize();
    const runner = legacy.createQueryRunner();
    await runner.connect();
    await runner.query(`
      CREATE TABLE users (
        id integer PRIMARY KEY,
        username varchar(100) NOT NULL UNIQUE,
        password_hash varchar(255) NOT NULL,
        full_name varchar(100) NOT NULL,
        role varchar(50) NOT NULL,
        created_at datetime NOT NULL,
        updated_at datetime NOT NULL
      )
    `);
    await runner.query(
      "INSERT INTO users VALUES (1, 'alex.santos', 'saved-hash', 'Alex Santos', 'Inventory Staff', '2026-01-01', '2026-01-01')",
    );
    await runner.query(
      'CREATE UNIQUE INDEX idx_users_username ON users (username)',
    );

    await new EmailAuthentication1720000000003().up(runner);

    const migratedUsers = (await runner.query(
      'SELECT email, legacy_username, password_hash FROM users',
    )) as { email: string | null; legacy_username: string; password_hash: string }[];
    expect(migratedUsers[0]).toEqual({
      email: null,
      legacy_username: 'alex.santos',
      password_hash: 'saved-hash',
    });

    await runner.release();
    await legacy.destroy();
  });

  it('adds furniture names without changing existing production records', async () => {
    const legacy = new DataSource({ type: 'sqljs' });
    await legacy.initialize();
    const runner = legacy.createQueryRunner();
    await runner.connect();
    await runner.query(`
      CREATE TABLE productions (
        id integer PRIMARY KEY,
        production_date date NOT NULL,
        quantity_produced integer NOT NULL,
        production_status varchar(50) NOT NULL
      )
    `);
    await runner.query(
      "INSERT INTO productions VALUES (1, '2026-10-24', 20, 'Completed')",
    );

    const migration = new ProductionFurnitureName1720000000004();
    await migration.up(runner);
    await migration.up(runner);

    const records = (await runner.query(
      'SELECT id, furniture_name, quantity_produced FROM productions',
    )) as {
      id: number;
      furniture_name: string | null;
      quantity_produced: number;
    }[];
    expect(records[0]).toEqual({
      id: 1,
      furniture_name: null,
      quantity_produced: 20,
    });

    await runner.release();
    await legacy.destroy();
  });

  it('removes exact duplicate finished records and blocks duplicate inserts', async () => {
    const legacy = new DataSource({ type: 'sqljs' });
    await legacy.initialize();
    const runner = legacy.createQueryRunner();
    await runner.connect();
    await runner.query(`
      CREATE TABLE productions (
        id integer PRIMARY KEY,
        user_id integer NOT NULL,
        production_date date NOT NULL,
        furniture_name varchar(100) NULL,
        quantity_produced integer NOT NULL,
        production_status varchar(50) NOT NULL
      )
    `);
    await runner.query(`
      CREATE TABLE finished_products (
        id integer PRIMARY KEY,
        production_id integer NOT NULL,
        product_name varchar(100) NOT NULL,
        quantity_available integer NOT NULL,
        date_completed date NOT NULL
      )
    `);
    await runner.query(
      "INSERT INTO productions VALUES (1, 1, '2026-10-24', 'Oak table', 20, 'Completed')",
    );
    await runner.query(`
      INSERT INTO finished_products VALUES
        (1, 1, 'Oak Dining Table', 20, '2026-10-24'),
        (2, 1, ' oak dining table ', 20, '2026-10-24')
    `);

    await new ExactRecordPrevention1720000000005().up(runner);
    await new EnsureExactRecordIndexes1720000000006().up(runner);

    const rows = (await runner.query(
      'SELECT id, product_name FROM finished_products',
    )) as { id: number; product_name: string }[];
    expect(rows).toEqual([{ id: 1, product_name: 'Oak Dining Table' }]);
    await expect(
      runner.query(
        "INSERT INTO finished_products VALUES (3, 1, 'oak dining table', 20, '2026-10-24')",
      ),
    ).rejects.toThrow();

    await runner.release();
    await legacy.destroy();
  });

  it('removes only empty legacy tables in dependency order', async () => {
    const legacy = new DataSource({ type: 'sqljs' });
    await legacy.initialize();
    const runner = legacy.createQueryRunner();
    await runner.connect();
    await runner.query('CREATE TABLE products (id integer PRIMARY KEY)');
    await runner.query(`
      CREATE TABLE production_orders (
        id integer PRIMARY KEY,
        product_id integer REFERENCES products (id)
      )
    `);
    await runner.query('CREATE TABLE suppliers (id integer PRIMARY KEY)');
    await runner.query(`
      CREATE TABLE materials (
        id integer PRIMARY KEY,
        supplier_id integer REFERENCES suppliers (id)
      )
    `);

    await new RemoveEmptyLegacyTables1720000000002().up(runner);

    for (const table of ['production_orders', 'products', 'materials', 'suppliers']) {
      expect(await runner.hasTable(table)).toBe(false);
    }
    await runner.release();
    await legacy.destroy();
  });

  it('preserves legacy tables when any one contains data', async () => {
    const legacy = new DataSource({ type: 'sqljs' });
    await legacy.initialize();
    const runner = legacy.createQueryRunner();
    await runner.connect();
    await runner.query('CREATE TABLE materials (id integer PRIMARY KEY)');
    await runner.query('INSERT INTO materials VALUES (1)');

    await expect(
      new RemoveEmptyLegacyTables1720000000002().up(runner),
    ).rejects.toThrow('contains data and was not removed');
    expect(await runner.hasTable('materials')).toBe(true);

    await runner.release();
    await legacy.destroy();
  });
});
