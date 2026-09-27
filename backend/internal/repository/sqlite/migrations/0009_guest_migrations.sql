CREATE TABLE guest_migrations (
    user_id TEXT NOT NULL,
    migration_id TEXT NOT NULL,
    imported_items INTEGER NOT NULL CHECK (imported_items >= 0),
    imported_planned_purchases INTEGER NOT NULL CHECK (imported_planned_purchases >= 0),
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, migration_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_guest_migrations_user_id
ON guest_migrations (user_id, created_at);
