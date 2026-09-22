# Cost Per Day - Backend Service

A lightweight Go HTTP service built with Gin that establishes the shared API boundary for items and application settings.

## Architecture

The backend adheres to clean separation of concerns:

```text
HTTP Transport (Gin router, handlers, DTOs, response envelope)
    -> Application Service (ItemService, SettingsService, domain validation)
        -> Repository Interfaces (ItemRepository, SettingsRepository)
            -> In-Memory Adapter (Thread-safe memory store)
```

- **Transport Decoupling**: Gin and `*gin.Context` remain strictly inside the transport layer (`internal/transport/http`).
- **Domain Independence**: Domain models and application use cases accept standard `context.Context` and do not depend on HTTP frameworks or storage drivers.
- **Composition Root**: Dependency injection and wiring is centralized in `cmd/server/main.go`.

## Environment Variables

| Variable | Description | Default |
| --- | --- | --- |
| `PORT` | Port on which the HTTP server listens | `8080` |
| `GIN_MODE` | Gin operational mode (`debug`, `release`, `test`) | `release` |
| `ALLOWED_ORIGINS` | Allowed origins for CORS headers | `*` |

## Local Development

### Prerequisites

- Go 1.22 or higher

### Running the Service

```bash
cd backend
go run ./cmd/server
```

The service will start on `http://localhost:8080`.

### Running Tests

```bash
cd backend
go test -v ./...
```

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
  - Retrieves all application preferences (e.g. `language`, `currency`).
- `PUT /api/settings/:key`
  - Updates a specific preference.
  - Body: `{"value": "id"}`
