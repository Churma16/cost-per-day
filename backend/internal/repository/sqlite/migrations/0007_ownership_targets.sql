ALTER TABLE items
ADD COLUMN target_type TEXT
CHECK (target_type IS NULL OR target_type IN ('cost_per_day', 'duration'));

ALTER TABLE items
ADD COLUMN target_value REAL
CHECK (target_value IS NULL OR target_value > 0);
