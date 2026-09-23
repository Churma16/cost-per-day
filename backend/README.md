# Cost Per Day - Backend Service

A lightweight Go HTTP service built with Gin that establishes the shared API boundary for user-owned items and settings.

## Architecture

The backend keeps HTTP, application behavior, repository contracts, and persistence details separate:

```text
HTTP Transport (Gin router, auth middleware, handlers, DTOs, response envelope)
    -> Application Services (AuthService, ItemService, SettingsService)
        -> Repository Interfaces (User, Session, Item, Settings)
            -> SQLite Adapter (database/sql + explicit raw SQL)

Google OIDC Adapter
    -> verified Google identity (sub + profile)
        -> AuthService
            -> local User + application-owned Session
```

- **Transport Decoupling**: Gin and `*gin.Context` remain strictly inside `internal/transport/http`.
- **Domain Independence**: Domain models and application services depend on repository interfaces, not SQLite.
- **Persistence Isolation**: SQLite queries live only in `internal/repository/sqlite`.
- **Composition Root**: Concrete SQLite repositories are selected only in `cmd/server/main.go`.

The in-memory repositories remain available for focused unit tests. User-owned operations require a local user ID supplied by the transport authentication boundary. Google tokens and claims stop at the OIDC adapter; item and settings services receive only the application-owned local user ID.

## SQLite Persistence

The backend uses Go's standard `database/sql` package with `modernc.org/sqlite`.

Runtime defaults:

- WAL journal mode;
- foreign key enforcement;
- 5 second busy timeout;
- a small connection pool suitable for the single-VPS workload;
- no external database service.

Item prices are persisted as integer micro-units:

```text
stored_price = price * 1,000,000
```

This preserves up to six fractional decimal places while keeping the existing domain/API `float64` model unchanged.

### Schema Migrations

Schema evolution is driven by explicit SQL files under:

```text
internal/repository/sqlite/migrations/
```

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
| `LEGACY_OWNER_GOOGLE_SUB` | Optional verified Google subject allowed to adopt the pre-auth `legacy` user during upgrade | empty |

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

For local split frontend/backend development, configure a Google web OAuth client with `http://localhost:8080/auth/google/callback` as an authorized redirect URI, set `APP_BASE_URL=http://localhost:3000`, and provide the required secrets from `.env.example`. The service will start on `http://127.0.0.1:8080` and create the configured SQLite database if it does not already exist.

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

### Upgrading Existing Single-User Data

Migration v3 preserves pre-authentication items and settings under the deterministic local user `legacy`. Before the first authenticated login on an upgraded database, set `LEGACY_OWNER_GOOGLE_SUB` to the existing owner's verified Google OIDC `sub`. Only a token verified by Google with that exact subject can adopt the `legacy` user. The subject is then persisted on that local user, so the environment variable may be removed after a successful bootstrap login.

Do not use email as the bootstrap identity key and do not set this value to a subject that is not the intended existing data owner. When meaningful unclaimed legacy data exists, startup fails if `LEGACY_OWNER_GOOGLE_SUB` is missing, and sign-in refuses subjects that do not match the configured owner. Untouched built-in `language=en` and `currency=USD` defaults alone do not trigger this migration guard.
