FROM node:22-alpine AS frontend-build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV GENERATE_SOURCEMAP=false
RUN npx react-scripts build

FROM golang:1.25.5-alpine AS backend-build

WORKDIR /src/backend

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend ./

RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/cost-per-day ./cmd/server

FROM alpine:3.22

RUN apk add --no-cache ca-certificates tzdata \
    && addgroup -S -g 10001 app \
    && adduser -S -D -H -u 10001 -G app app \
    && mkdir -p /app/web /var/lib/cost-per-day \
    && chown -R app:app /app /var/lib/cost-per-day

WORKDIR /app

COPY --from=backend-build --chown=app:app /out/cost-per-day /app/cost-per-day
COPY --from=frontend-build --chown=app:app /app/build /app/web

ENV PORT=8080 \
    GIN_MODE=release \
    DATABASE_PATH=/var/lib/cost-per-day/cost-per-day.db \
    STATIC_DIR=/app/web

USER app

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/health || exit 1

ENTRYPOINT ["/app/cost-per-day"]
