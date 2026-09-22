CREATE TABLE items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price_micros INTEGER NOT NULL CHECK (price_micros > 0),
    purchase_date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

INSERT INTO settings (key, value, updated_at)
VALUES
    ('language', 'en', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('currency', 'USD', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
