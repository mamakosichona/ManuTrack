# ManuTrack

ManuTrack is a wooden furniture workshop tracking system. It helps teams keep track of lumber, sheet goods, hardware, finishes, stock quantities, furniture production, and completed pieces.

## Stack

- NestJS, TypeScript, React, and Vite
- TypeORM with SQLite (SQL.js)
- JWT authentication and bcrypt password hashing
- Request validation and role-based access control
- Swagger UI at `/api/v1/docs`

## Run locally

1. Copy `.env.example` to `.env` and replace `JWT_SECRET` with a private random value of at least 32 characters.
2. Keep `DB_SYNC=true` for local development. The plan-alignment migration runs on startup, preserving users and raw-material quantities when it can map them.
3. Install dependencies and start the API:

   ```sh
   npm install
   npm run start:dev
   ```

4. Create the initial Administrator at `POST /api/v1/auth/register`, then sign in at `POST /api/v1/auth/login`. Public registration is permanently closed after the initial account is created. If a migrated database has no Administrator, one bootstrap registration is available. Run initial setup only in a trusted environment.
5. In another terminal, install and start the frontend:

   ```sh
   npm --prefix frontend install
   npm run frontend:dev
   ```

6. Open `http://localhost:5173`. Vite proxies `/api` requests to the backend on port 3000.

Set `DB_SYNC=false` outside local development; schema migrations still run automatically. `database/schema.sql` describes the planned schema for an empty database. Keep `.env` files and database files private. Use HTTPS when deploying beyond localhost.

## Authentication and roles

Users sign in with an email address and password. Passwords are stored as bcrypt hashes. Successful API responses use:

```json
{
  "success": true,
  "data": {},
  "timestamp": "2026-10-24T09:30:00.000Z"
}
```

Errors use `success: false`, `statusCode`, `message`, `errors`, and `timestamp`. Protected endpoints require `Authorization: Bearer <token>`.

| Role | Permissions |
|---|---|
| Administrator | Manage users; all inventory and production actions |
| Inventory Staff | Create/update workshop materials and view/update stock |
| Production Staff | View/create furniture production records and finished furniture |
| Any authenticated user | View workshop materials and finished furniture |

The initial public registration creates one Administrator and sets a persistent bootstrap flag. Thereafter, only an Administrator can create users or change user details and roles; demoting the initial account does not reopen public registration.

## API endpoints

All routes are prefixed with `/api/v1`. Unlisted routes are JWT-protected.

| Method | Path | Access |
|---|---|---|
| POST | `/auth/register` | Public, initial Administrator bootstrap only |
| POST | `/auth/login` | Public |
| GET | `/auth/me` | Authenticated |
| GET, POST | `/users` | Administrator |
| GET, PATCH | `/users/:id` | Administrator |
| GET | `/raw-materials` | Authenticated |
| POST, PATCH | `/raw-materials`, `/raw-materials/:id` | Inventory Staff, Administrator |
| GET | `/inventories` | Inventory Staff, Administrator |
| PATCH | `/inventories/:id` | Inventory Staff, Administrator |
| GET, POST, PATCH, DELETE | `/productions` | Production Staff, Administrator |
| GET, POST, PATCH, DELETE | `/finished-products` | Authenticated for GET; Production Staff, Administrator for changes |

Create workshop materials with `materialName`, `unit`, and optional `description`; examples include kiln-dried oak boards (`board feet`), plywood (`sheets`), wood screws (`pieces`), and varnish (`liters`). Each new material gets a linked zero-quantity stock record. Stock updates require a non-negative number with up to two decimal places. Production records include `userId`, `productionDate`, required `furnitureName`, `quantityProduced` (pieces), and `productionStatus`. Finished furniture records include `productionId`, `productName` (for example, `Oak dining table`), `quantityAvailable`, and `dateCompleted`; the production's furniture name is prefilled when adding a finished-furniture record.

The current system tracks material stock and furniture output, but does not yet define product designs or bills of materials, or automatically deduct material usage when production is recorded.

Production and finished-furniture records can be edited or deleted by their owning Production Staff member or an Administrator. Exact duplicate records are rejected; duplicate detection ignores surrounding spaces and letter case in furniture names. The migration removes extra exact duplicate finished-furniture rows while keeping the earliest record. A production record with linked finished-furniture records cannot be deleted until those finished records are removed.

The API uses integer IDs. Missing records return 404, invalid input returns 400, invalid authentication returns 401, insufficient role permissions return 403, and duplicate email addresses return 409.

## Data and migration notes

The schema follows the plan's `USER`, `RAW MATERIAL`, `INVENTORY`, `PRODUCTION`, and `FINISHED PRODUCT` entities, applied to a wooden furniture workshop. Each material or component has one inventory record; each production record belongs to a user; finished-furniture records link to production.

During migration, existing email addresses and password hashes are retained when available; legacy `admin` accounts map to `Administrator` and `operator` accounts map to `Inventory Staff`. Accounts from a username-only database keep their existing credentials but need an Administrator to assign an email address before they can sign in. Legacy material names, units, and quantities are copied into the planned raw-material and inventory tables.

The production furniture-name migration preserves existing production records; their name is shown as “Name not recorded.” New production entries require a furniture name.

Empty legacy product, production-order, material, and supplier tables are removed by migration. If any of those tables contain records, the migration stops and preserves them until they are backed up or explicitly migrated. Production orders do not record the user who performed the work, so converting them into plan-compliant production records would invent attribution. Assignments from the plan to use an email notification service are not implemented yet; the provider and notification triggers need to be specified.

## Testing

```sh
npm test -- --runInBand
npm run build
npm run frontend:build
```

Import `postman/ManuTrack.postman_collection.json`, run the initial Administrator registration (only when no Administrator exists), and then run Login. The login request stores the JWT for the remaining requests. Swagger is available at `http://localhost:3000/api/v1/docs`.
