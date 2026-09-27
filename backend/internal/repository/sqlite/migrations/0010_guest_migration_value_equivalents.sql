ALTER TABLE guest_migrations
ADD COLUMN imported_value_equivalents INTEGER NOT NULL DEFAULT 0
CHECK (imported_value_equivalents >= 0);
