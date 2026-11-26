PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id integer PRIMARY KEY AUTOINCREMENT,
  email varchar(255) NULL UNIQUE,
  legacy_username varchar(255) NOT NULL UNIQUE,
  password_hash varchar(255) NOT NULL,
  full_name varchar(100) NOT NULL,
  role varchar(50) NOT NULL
    CHECK (role IN ('Administrator', 'Inventory Staff', 'Production Staff')),
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_settings (
  key varchar(100) NOT NULL PRIMARY KEY,
  value varchar(20) NOT NULL
);

INSERT OR IGNORE INTO system_settings (key, value)
  VALUES ('admin_registration_closed', 'false');

CREATE TABLE IF NOT EXISTS raw_materials (
  id integer PRIMARY KEY AUTOINCREMENT,
  material_name varchar(100) NOT NULL,
  unit varchar(30) NOT NULL,
  description varchar(255) NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventories (
  id integer PRIMARY KEY AUTOINCREMENT,
  raw_material_id integer NOT NULL UNIQUE,
  quantity_available decimal(10,2) NOT NULL DEFAULT 0
    CHECK (quantity_available >= 0),
  last_updated datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventories_raw_material
    FOREIGN KEY (raw_material_id) REFERENCES raw_materials (id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_inventories_raw_material_id
  ON inventories (raw_material_id);

CREATE TABLE IF NOT EXISTS productions (
  id integer PRIMARY KEY AUTOINCREMENT,
  user_id integer NOT NULL,
  production_date date NOT NULL,
  furniture_name varchar(100) NULL,
  quantity_produced integer NOT NULL CHECK (quantity_produced > 0),
  production_status varchar(50) NOT NULL
    CHECK (production_status IN ('Completed', 'In Process')),
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_productions_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_productions_user_id ON productions (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_productions_exact_record
  ON productions (
    user_id, production_date, lower(trim(furniture_name)),
    quantity_produced, production_status
  );

CREATE TABLE IF NOT EXISTS finished_products (
  id integer PRIMARY KEY AUTOINCREMENT,
  production_id integer NOT NULL,
  product_name varchar(100) NOT NULL,
  quantity_available integer NOT NULL CHECK (quantity_available >= 0),
  date_completed date NOT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_finished_products_production
    FOREIGN KEY (production_id) REFERENCES productions (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_finished_products_production_id
  ON finished_products (production_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_finished_products_exact_record
  ON finished_products (
    production_id, lower(trim(product_name)),
    quantity_available, date_completed
  );
