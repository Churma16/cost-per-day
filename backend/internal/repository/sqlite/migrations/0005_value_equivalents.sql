CREATE TABLE value_equivalents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    amount_micros INTEGER NOT NULL CHECK (amount_micros > 0),
    currency_code TEXT NOT NULL CHECK (length(trim(currency_code)) > 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_value_equivalents_user_id
ON value_equivalents (user_id, id);
