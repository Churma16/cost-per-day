CREATE TABLE users (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (length(trim(id)) > 0)
);

INSERT INTO users (id, created_at, updated_at)
VALUES (
    'legacy',
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);

CREATE TABLE items_owned (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    price_micros INTEGER NOT NULL CHECK (price_micros > 0),
    purchase_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'retired', 'sold', 'lost')),
    ended_at TEXT,
    sale_price_micros INTEGER
        CHECK (sale_price_micros IS NULL OR sale_price_micros >= 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO items_owned (
    id,
    user_id,
    name,
    price_micros,
    purchase_date,
    status,
    ended_at,
    sale_price_micros,
    created_at,
    updated_at
)
SELECT
    id,
    'legacy',
    name,
    price_micros,
    purchase_date,
    status,
    ended_at,
    sale_price_micros,
    created_at,
    updated_at
FROM items;

DROP TABLE items;
ALTER TABLE items_owned RENAME TO items;

CREATE INDEX idx_items_user_id_id
ON items (user_id, id);

CREATE TABLE settings_owned (
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, key),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO settings_owned (user_id, key, value, updated_at)
SELECT 'legacy', key, value, updated_at
FROM settings;

DROP TABLE settings;
ALTER TABLE settings_owned RENAME TO settings;

CREATE INDEX idx_settings_user_id_key
ON settings (user_id, key);
