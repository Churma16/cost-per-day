-- Users that predate first-run onboarding already entered the product under the
-- old defaults. Mark them complete so deploying onboarding does not interrupt
-- their next session. Users created after this migration remain unconfigured.
INSERT INTO settings (user_id, key, value, updated_at)
SELECT
    id,
    'onboardingCompleted',
    'true',
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM users
WHERE 1
ON CONFLICT(user_id, key) DO NOTHING;
