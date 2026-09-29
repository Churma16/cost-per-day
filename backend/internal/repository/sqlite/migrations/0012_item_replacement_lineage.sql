ALTER TABLE items
ADD COLUMN replaces_item_id INTEGER
REFERENCES items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_items_replaces_item_id
ON items(replaces_item_id);
