CREATE TABLE planned_purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    target_price_micros INTEGER NOT NULL CHECK (target_price_micros > 0),
    currency_code TEXT NOT NULL CHECK (length(trim(currency_code)) > 0),
    target_date TEXT,
    contribution_amount_micros INTEGER CHECK (contribution_amount_micros IS NULL OR contribution_amount_micros > 0),
    contribution_cadence TEXT CHECK (contribution_cadence IS NULL OR contribution_cadence IN ('daily', 'weekly', 'monthly')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_planned_purchases_user_id
ON planned_purchases (user_id, id);
