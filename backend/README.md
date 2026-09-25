# Worthwhile - Backend Service

A lightweight Go HTTP service built with Gin that establishes the shared API boundary for user-owned items and settings.

## Architecture

The backend keeps HTTP, application behavior, repository contracts, and persistence details separate:

```text
HTTP Layer (Gin router, auth middleware, handlers, DTOs, response envelope)
    -> Application Services (AuthService, ItemService, SettingsService)
        -> Repository Interfaces (User, Session, Item, Settings, ValueEquivalent, PlannedPurchase)
            -> SQLite Adapter (GORM for CRUD reference / database/sql + raw SQL)

Google OIDC Adapter
    -> verified Google identity (sub + profile)
        -> AuthService
            -> local User + application-owned Session
```

- **HTTP Decoupling**: Gin and `*gin.Context` remain strictly inside `internal/http`.
- **Domain Independence**: Domain models and application services depend on repository interfaces, not SQLite or GORM. Domain structs contain no GORM tags or dependencies.
- **Persistence Boundary**: `*gorm.DB` is strictly encapsulated inside `internal/repository/sqlite`. It is never leaked to HTTP handlers, services, or domain packages.
- **Composition Root**: Concrete SQLite repositories are selected and wired only in `cmd/server/main.go`.

The in-memory repositories remain available for focused unit tests. User-owned operations require a local user ID supplied by the HTTP authentication boundary. Google tokens and claims stop at the OIDC adapter; item and settings services receive only the application-owned local user ID.

## Persistence Architecture & GORM Integration

The backend adopts GORM as an internal implementation tool behind the existing repository boundary to reduce boilerplate for standard CRUD operations while preserving explicit architecture and SQLite operational characteristics.

### Reference Implementation

`ValueEquivalentRepository` serves as the reference implementation for GORM persistence:
- Demonstrates persistence-specific model mapping (`valueEquivalentRecord` with column tags vs clean domain `domain.ValueEquivalent`).
- Maps storage micro-units (`amount_micros`) to domain amounts (`float64`).
- Handles GORM error translation (`gorm.ErrRecordNotFound` to `domain.ErrValueEquivalentNotFound`).
- Enforces user isolation on every query (`Where("user_id = ?", userID)`).

Other repositories remain on explicit SQL and may be migrated incrementally if GORM makes their persistence demonstrably clearer.

### GORM vs. Raw SQL Guidance

The project follows a pragmatic persistence philosophy rather than ORM purity:

- **Prefer GORM for**:
  - Standard entity CRUD (`Create`, `First`, `Find`, `Updates`, `Delete`);
  - Straightforward user-scoped queries and primary-key lookups;
  - Scenarios where ORM reduces repetitive `Scan` and `ExecContext` boilerplate.
- **Prefer Raw SQL for**:
  - Complex aggregations, reporting, and dashboard metrics;
  - Multi-table analytical joins;
  - SQLite-specific operations, pragmas, and indexing optimizations;
  - Queries where SQL is clearer, more maintainable, or more performant than ORM method chaining.

Multi-step business workflows belong in services and repository operations, not hidden inside GORM lifecycle callbacks (`BeforeCreate`, `AfterSave`).

### Schema Migration Policy & Why `AutoMigrate()` Is Not Used

Schema evolution is driven exclusively by explicit SQL migration files under:

```text
internal/repository/sqlite/migrations/
```

Tracked via SQLite `PRAGMA user_version`. GORM's `AutoMigrate()` is **strictly prohibited** in production for the following reasons:
- **Explicit & Reviewable**: Schema changes remain versioned, deterministic, and reviewable in pull requests.
- **Deterministic Order**: Embedded SQL migrations execute sequentially in transactional steps, guaranteeing consistent application across development, CI, and production.
- **No Implicit Mutation**: Application startup never silently mutates or infers production database schemas from Go struct definitions.
- **Predictable Recovery**: Schema compatibility checks and rollback boundaries remain explicit and auditable.

GORM models conform to the schema created by SQL migrations; they never define or alter the production schema.

## SQLite Persistence

The backend uses Go's standard `database/sql` package with `modernc.org/sqlite`, keeping the service completely **CGO-free** with no external C compiler requirements.

GORM attaches to the pre-configured `*sql.DB` connection pool through the maintained `gorm.io/driver/sqlite` dialector in connection-injection mode. The dialector does not open its default SQLite driver; runtime SQLite I/O continues through the existing pure-Go `modernc.org/sqlite` pool, preserving all operational database settings:

- WAL journal mode (`PRAGMA journal_mode = WAL`);
- Foreign key enforcement (`PRAGMA foreign_keys = 1`);
- 5 second busy timeout (`PRAGMA busy_timeout = 5000`);
- A small connection pool suitable for single-VPS workloads (`SetMaxOpenConns(4)`);
- Embedded SQL migrations executed prior to server launch.

Item prices and value equivalent amounts are persisted as integer micro-units:

```text
stored_price = price * 1,000,000
```

This preserves up to six fractional decimal places while keeping the existing domain/API `float64` model unchanged.

### Schema Migrations

Migrations run automatically during backend startup before the HTTP server begins accepting traffic. The current schema version is tracked with SQLite `PRAGMA user_version`.

Each migration runs in its own transaction together with the schema-version update. If a migration fails, that migration is rolled back and backend startup fails rather than continuing with a partially upgraded schema.

Migration v3 introduces the local `users` table plus `user_id` ownership for items and settings. Existing single-user rows are preserved and assigned to the deterministic `legacy` owner. Item IDs are preserved during the migration. Built-in language and currency defaults remain read-time fallbacks until a user stores an override.

For an upgrade that requires recovery, restore a known-good database backup and run the previous application version. Production backup/restore automation is tracked separately from this storage adapter.

## Environment Variables

| Variable | Description | Default |
| --- | --- | --- |
| `HOST` | Host interface on which the HTTP server listens | `127.0.0.1` |
| `PORT` | Port on which the HTTP server listens | `8080` |
| `GIN_MODE` | Gin operational mode (`debug`, `release`, `test`) | `release` |
| `ALLOWED_ORIGINS` | Comma-separated exact origins allowed for credentialed CORS | `APP_BASE_URL` origin |
| `DATABASE_PATH` | Filesystem path for the SQLite database | `./data/cost-per-day.db` |
| `STATIC_DIR` | Optional compiled frontend directory served by the backend | empty |
| `GOOGLE_CLIENT_ID` | Google OAuth/OIDC web client ID | required |
| `GOOGLE_CLIENT_SECRET` | Google OAuth/OIDC web client secret | required |
| `SESSION_SECRET` | Secret used to sign short-lived OIDC state/nonce cookies; minimum 32 characters | required |
| `APP_BASE_URL` | Public frontend origin used after authentication | required |
| `GOOGLE_REDIRECT_URI` | Google callback URI; defaults to `APP_BASE_URL/auth/google/callback` | derived |
| `AUTH_DISABLED` | Development-only authentication bypass using an explicit local development user | `false` |

Keep `DATABASE_PATH` on persistent storage in container or VPS deployments so application restarts and redeploys retain data. The production image sets `HOST=0.0.0.0` and `STATIC_DIR=/app/web`, which is a read-only application directory separate from the SQLite mount.

## Local Development

### Prerequisites

- Go 1.25.5 or higher
- *Optional (for hot reload)*: [Air](https://github.com/air-verse/air) v1.65.3:
  ```bash
  go install github.com/air-verse/air@v1.65.3
  ```

### Running the Service

#### Option A: Project Root (Recommended)
From the repository root, start both backend and frontend together:
```bash
npm run dev
```
The runner detects Air automatically and enables hot reload, or falls back to standard Go execution if Air is not installed.

#### Option B: Backend Only with Air (Hot Reload)
From the repository root:
```bash
npm run server:air
```

#### Option C: Backend Only with Standard Go
From the repository root:
```bash
npm run server:build
```

Both backend-only commands use the shared runner, which loads `backend/.env` before starting the selected backend mode.

For local split frontend/backend development, the shared runner automatically enables development auth bypass when Google OIDC credentials are absent. The bypass uses the explicit local user `dev-local`; it does not reuse historical production ownership. Set `AUTH_DISABLED=true` explicitly when the same behavior is needed outside the shared runner. To exercise real Google sign-in locally, configure a Google web OAuth client with `http://localhost:8080/auth/google/callback`, set `APP_BASE_URL=http://localhost:3000`, and provide the required secrets from `.env.example`.

### Running Tests

```bash
cd backend
go test -count=1 ./...
```

SQLite repository integration tests use isolated temporary database files and cover item CRUD, settings persistence, operational PRAGMAs, repeatable migrations, persistence after reopen, legacy-data migration, and cross-user isolation for list/detail/update/delete/replace/settings operations.

## API Specifications

### Canonical Response Envelope

All JSON API endpoints return responses using the unified top-level envelope:

```json
{
  "meta": {
    "code": 200,
    "message": "success message"
  },
  "data": { ... }
}
```

- `meta.code`: Strictly mirrors the HTTP response status code.
- `meta.message`: Short human-readable summary.
- `data`: Response payload, or `null` when no payload is returned.

Persistence failures remain internal and are translated by the existing HTTP error boundary into generic API error messages rather than returning raw database errors.

### Endpoints

#### Health Check

- `GET /health`
  - Returns operational status of the service.

#### Items API

- `GET /api/items`
  - Retrieves all tracked items.
- `POST /api/items`
  - Creates a new item.
  - Body: `{"name": "Laptop", "price": 1200.0, "purchaseDate": "2026-09-22T12:00:00Z"}`
- `PUT /api/items/:id`
  - Updates an existing item by ID.
  - Body: `{"name": "Laptop Pro", "price": 1400.0, "purchaseDate": "2026-09-22T12:00:00Z"}`
- `DELETE /api/items/:id`
  - Removes an item by ID.

#### Settings API

- `GET /api/settings`
  - Retrieves all application preferences such as `language` and `currency`.
- `PUT /api/settings/:key`
  - Updates a specific preference.
  - Body: `{"value": "id"}`


### Authentication API

- `GET /auth/google/login`
  - Creates short-lived signed state/nonce data and redirects the browser to Google.
- `GET /auth/google/callback`
  - Validates state, exchanges the authorization code, verifies the Google ID token signature/issuer/audience/expiry/nonce, maps Google `sub` to one local user, creates an opaque application session, and redirects to `APP_BASE_URL`.
- `POST /auth/logout`
  - Invalidates the application session and clears the session cookie.
- `GET /api/me`
  - Returns the authenticated local user's non-sensitive profile in the canonical JSON envelope.

Item and settings endpoints require the application session cookie. Google access and ID tokens are never used as item/settings ownership identifiers.

The application session cookie is `HttpOnly` and `SameSite=Lax`. It is also `Secure` whenever `APP_BASE_URL` uses HTTPS, which is required for internet-exposed deployments. Credentialed CORS uses exact origin matching; wildcard origins are rejected when the authenticated server starts.

### Historical User IDs

Migration v3 remains unchanged because it records how pre-authentication databases were upgraded to user ownership. An already-adopted user may therefore still have the local ID `legacy`; once that row has a Google subject, authentication treats it exactly like any other returning user and does not rename the stored identifier.

Before deploying a release that removes the retired adoption path, verify the deployed database has no meaningful unclaimed pre-authentication data. Production verification steps are documented in `docs/production.md`.
