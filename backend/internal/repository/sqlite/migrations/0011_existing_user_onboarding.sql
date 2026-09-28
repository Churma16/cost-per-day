-- Grandfather only users who explicitly persisted both required preferences.
-- Repository fallback values are intentionally insufficient because they do
-- not prove that the user has configured onboarding.
INSERT INTO settings (user_id, key, value, updated_at)
SELECT
    users.id,
    'onboardingCompleted',
    'true',
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM users
WHERE EXISTS (
    SELECT 1
    FROM settings AS language_setting
    WHERE language_setting.user_id = users.id
      AND language_setting.key = 'language'
      AND lower(trim(language_setting.value)) IN ('en', 'id')
)
AND EXISTS (
    SELECT 1
    FROM settings AS currency_setting
    WHERE currency_setting.user_id = users.id
      AND currency_setting.key = 'currency'
      AND upper(trim(currency_setting.value)) IN ('USD', 'EUR', 'CNY', 'IDR')
)
ON CONFLICT(user_id, key) DO NOTHING;
