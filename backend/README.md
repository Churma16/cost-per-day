# Cost Per Day - Backend Service

A lightweight Go HTTP service built with Gin that establishes the shared API boundary for items and application settings.

## Architecture

The backend keeps HTTP, application behavior, repository contracts, and persistence details separate:

```text
HTTP Transport (Gin router, handlers, DTOs, response envelope)
    -> Application Service (ItemService, SettingsService, domain validation)
        -> Repository Interfaces (ItemRepository, SettingsRepository)
            -> SQLite Adapter (database/sql + explicit raw SQL)
```

- **Transport Decoupling**: Gin and `*gin.Context` remain strictly inside `internal/transport/http`.
- **Domain Independence**: Domain models and application services depend on repository interfaces, not SQLite.
- **Persistence Isolation**: SQLite queries live only in `internal/repository/sqlite`.
- **Composition Root**: Concrete SQLite repositories are selected only in `cmd/server/main.go`.

The in-memory repositories remain available for focused unit tests.

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

For an upgrade that requires recovery, restore a known-good database backup and run the previous application version. Production backup/restore automation is tracked separately from this storage adapter.

## Environment Variables

| Variable | Description | Default |
| --- | --- | --- |
| `PORT` | Port on which the HTTP server listens | `8080` |
| `GIN_MODE` | Gin operational mode (`debug`, `release`, `test`) | `release` |
| `ALLOWED_ORIGINS` | Allowed origins for CORS headers | `*` |
| `DATABASE_PATH` | Filesystem path for the SQLite database | `./data/cost-per-day.db` |
| `STATIC_DIR` | Optional compiled frontend directory served by the backend | empty |

Keep `DATABASE_PATH` on persistent storage in container or VPS deployments so application restarts and redeploys retain data. The production image sets `STATIC_DIR=/app/web`, which is a read-only application directory separate from the SQLite mount.

## Local Development

### Prerequisites

- Go 1.25.5 or higher

### Running the Service

```bash
cd backend
go run ./cmd/server
```

The service will start on `http://localhost:8080` and create the configured SQLite database if it does not already exist.

### Running Tests

```bash
cd backend
go test -count=1 ./...
```

SQLite repository integration tests use isolated temporary database files and cover item CRUD, settings persistence, operational PRAGMAs, repeatable migrations, and persistence after closing and reopening the same database file.

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
