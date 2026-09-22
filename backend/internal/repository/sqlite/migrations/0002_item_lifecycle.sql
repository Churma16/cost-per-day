ALTER TABLE items
ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
CHECK (status IN ('active', 'retired', 'sold', 'lost'));

ALTER TABLE items
ADD COLUMN ended_at TEXT;

ALTER TABLE items
ADD COLUMN sale_price_micros INTEGER
CHECK (sale_price_micros IS NULL OR sale_price_micros >= 0);
