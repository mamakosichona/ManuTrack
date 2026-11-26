import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as Joi from 'joi';
import { AuthModule } from './auth/auth.module';
import { FinishedProductsModule } from './finished-products/finished-products.module';
import { InventoriesModule } from './inventories/inventories.module';
import { RolesGuard } from './auth/guards/roles.guard';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { ProductionsModule } from './productions/productions.module';
import { RawMaterialsModule } from './raw-materials/raw-materials.module';
import { PlanAlignment1720000000000 } from './database/migrations/1720000000000-PlanAlignment';
import { AdminRegistrationBootstrap1720000000001 } from './database/migrations/1720000000001-AdminRegistrationBootstrap';
import { RemoveEmptyLegacyTables1720000000002 } from './database/migrations/1720000000002-RemoveEmptyLegacyTables';
import { EmailAuthentication1720000000003 } from './database/migrations/1720000000003-EmailAuthentication';
import { ProductionFurnitureName1720000000004 } from './database/migrations/1720000000004-ProductionFurnitureName';
import { ExactRecordPrevention1720000000005 } from './database/migrations/1720000000005-ExactRecordPrevention';
import { EnsureExactRecordIndexes1720000000006 } from './database/migrations/1720000000006-EnsureExactRecordIndexes';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        PORT: Joi.number().port().default(3000),
        FRONTEND_ORIGIN: Joi.string().default('http://localhost:5173'),
        DB_DATABASE: Joi.string().default('database/manutrack.sqlite'),
        DB_SYNC: Joi.boolean().default(false),
        JWT_SECRET: Joi.string().min(32).required(),
      }),
    }),
    TypeOrmModule.forRoot({
      type: 'sqljs',
      location: process.env.DB_DATABASE ?? 'database/manutrack.sqlite',
      autoSave: true,
      autoLoadEntities: true,
      synchronize: process.env.DB_SYNC?.toLowerCase() === 'true',
      migrations: [
        PlanAlignment1720000000000,
        AdminRegistrationBootstrap1720000000001,
        RemoveEmptyLegacyTables1720000000002,
        EmailAuthentication1720000000003,
        ProductionFurnitureName1720000000004,
        ExactRecordPrevention1720000000005,
        EnsureExactRecordIndexes1720000000006,
      ],
      migrationsRun: true,
    }),
    AuthModule,
    RawMaterialsModule,
    InventoriesModule,
    ProductionsModule,
    FinishedProductsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
