# Production Self-Hosting

This document defines the supported production boundary for a small single-VPS deployment.

## Runtime Topology

```text
Browser
   -> HTTPS reverse proxy
       -> 127.0.0.1:8080
           -> Cost Per Day container
               -> Go HTTP server
                   -> React static build
                   -> /api
                   -> /health
                   -> SQLite on persistent storage
```

The production image runs one application process. The Go server serves the compiled React application and the API from the same origin.

SQLite must not live in the container's writable layer. Mount a durable host directory at:

```text
/var/lib/cost-per-day
```

The default production database path is:

```text
/var/lib/cost-per-day/cost-per-day.db
```

The image runs as UID/GID `10001`. The mounted directory must be writable by that identity.

## Runtime Configuration

Current application configuration:

| Variable | Purpose | Production value |
| --- | --- | --- |
| `PORT` | HTTP listen port inside the container | `8080` |
| `GIN_MODE` | Gin runtime mode | `release` |
| `DATABASE_PATH` | SQLite file path | `/var/lib/cost-per-day/cost-per-day.db` |
| `STATIC_DIR` | Compiled React directory | `/app/web` |
| `ALLOWED_ORIGINS` | CORS policy | same production origin when cross-origin access is required |

The compiled frontend directory and SQLite directory are separate by construction. The HTTP static-file fallback only reads from `STATIC_DIR`, so database files, environment files, repository metadata, and runtime secrets are not part of the public static root.

Do not commit `.env` files, database files, Google credentials, or session secrets.

## HTTPS and Reverse Proxy

Any deployment reachable from the public internet must terminate HTTPS before traffic reaches the application.

The application should remain bound to loopback on the VPS:

```text
127.0.0.1:8080
```

Example Caddy configuration:

```text
worthwhile.example.com {
    reverse_proxy 127.0.0.1:8080
}
```

Caddy can manage certificate issuance and renewal automatically. An equivalent nginx, Traefik, or managed reverse proxy is also acceptable as long as public traffic uses HTTPS and only the reverse proxy can reach the loopback application port.

## Google OIDC Production Configuration

Google OIDC is implemented by issue #10 and multi-user ownership by issue #9. This production issue must consume those boundaries after they land rather than adding a deployment-specific login mechanism.

The expected production secret/configuration contract from #10 is:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
SESSION_SECRET
APP_BASE_URL=https://worthwhile.example.com
```

The Google OAuth client should register the callback produced by the authentication implementation. With the route proposed by #10, that is:

```text
https://worthwhile.example.com/auth/google/callback
```

Do not register an HTTP callback for an internet-exposed deployment.

Production session cookies from #10 must be `HttpOnly`, `Secure`, and use the SameSite policy selected by the authentication implementation. Deployment configuration must not weaken those settings.

Until #9 and #10 are implemented, the application does not satisfy the multi-user authentication acceptance criteria from issue #7.

## Health Check

Use:

```text
GET /health
```

The endpoint reports service availability without returning item, setting, or other user-owned data.

The production image includes a Docker health check against the backend health endpoint. This means container health verifies the actual Go service rather than only a static web server.

## Backup

SQLite runs in WAL mode, so do not copy only the main `.db` file while the application is actively writing.

Use SQLite's online backup command from the VPS host:

```bash
mkdir -p "$HOME/cost-per-day/backups"

backup="$HOME/cost-per-day/backups/cost-per-day-$(date +%Y%m%d-%H%M%S).db"

sqlite3 "$HOME/cost-per-day/data/cost-per-day.db" ".backup '$backup'"
sqlite3 "$backup" "PRAGMA integrity_check;"
```

The integrity check must return:

```text
ok
```

Keep backups outside the live data directory and protect them with the same access controls as the production database.

## Restore

Verify restores against a disposable deployment before relying on a backup operationally.

For a production restore:

```bash
cd "$HOME/cost-per-day"

docker compose stop app

pre_restore="backups/pre-restore-$(date +%Y%m%d-%H%M%S).db"
sqlite3 data/cost-per-day.db ".backup '$pre_restore'"
sqlite3 "$pre_restore" "PRAGMA integrity_check;"

restore_file="$PWD/backups/KNOWN-GOOD.db"

docker run --rm \
  -v "$PWD/data:/data" \
  -v "$restore_file:/restore/backup.db:ro" \
  alpine:3.22 \
  sh -ec 'rm -f /data/cost-per-day.db /data/cost-per-day.db-wal /data/cost-per-day.db-shm; cp /restore/backup.db /data/cost-per-day.db; chown -R 10001:10001 /data'

docker compose up -d app
```

Then verify:

```bash
curl --fail http://127.0.0.1:8080/health
```

Also verify representative application data through the UI/API. Once #10 exists, include a real login and authenticated item access in the restore verification.

## Upgrade and Migration

Before deploying an application version that contains a new database migration:

1. Create and integrity-check a fresh backup.
2. Deploy the new image while reusing the same persistent SQLite directory.
3. Let application startup apply embedded migrations.
4. Verify `/health` and representative application data.
5. Keep the pre-upgrade backup until the new version is accepted.

Migrations run during backend startup and update `PRAGMA user_version` transactionally. The backend refuses to start if the database schema is newer than the application supports.

An image rollback does not automatically mean a database rollback is safe. If a migration is not backward compatible, restore the matching pre-upgrade database backup before starting the older application image.

## Production Smoke Check

Pull request CI builds the production Docker image and verifies:

- `GET /health` reaches the backend;
- the compiled React application is served from `/`;
- data can be created through the backend API;
- recreating the container with the same mounted data directory preserves that data;
- SQLite online backup produces a database that passes `PRAGMA integrity_check`;
- restoring that backup into a clean data directory preserves the previously created data.

After #9 and #10 land, extend this smoke check to cover Google login/session behavior and authenticated user-scoped item access.

## Scope

The supported target is one small VPS, one application container, one reverse proxy, and one persistent SQLite directory.

Kubernetes, a multi-node database, organizations, roles, and unrelated infrastructure are intentionally out of scope.
