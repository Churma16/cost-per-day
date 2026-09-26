const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const defaultDatabasePath = path.resolve(__dirname, '..', 'backend', 'data', 'cost-per-day.db');
const databaseFilePath = process.env.DATABASE_PATH || defaultDatabasePath;

const MICROS_MULTIPLIER = 1_000_000;

const previousItemNamesToClean = [
  'Mechanical Keyboard Custom',
  'Noise-Cancelling Earbuds',
  'Ergonomic Standing Desk',
  'Ultrabook Work Laptop',
  'Mirrorless Camera & Lens',
  'Flagship Smartphone',
  'Kindle Paperwhite',
];

const plannedPurchaseSeedItems = [
  {
    name: 'Demo · Target Price Only (No Pacing)',
    targetPrice: 2_500_000,
    currencyCode: 'IDR',
    targetDate: null,
    contributionAmount: null,
    contributionCadence: null,
    descriptionState: 'Baseline: Target Price Only (No Cadence / No Deadline)',
  },
  {
    name: 'Demo · Daily Micro-Saving (Daily Cadence)',
    targetPrice: 1_500_000,
    currencyCode: 'IDR',
    targetDate: null,
    contributionAmount: 25_000,
    contributionCadence: 'daily',
    descriptionState: 'Contribution to Time: Daily Micro-Saving (Rp 25.000 / day -> 60 days)',
  },
  {
    name: 'Demo · Weekly Budgeting (Weekly Cadence)',
    targetPrice: 3_500_000,
    currencyCode: 'IDR',
    targetDate: null,
    contributionAmount: 250_000,
    contributionCadence: 'weekly',
    descriptionState: 'Contribution to Time: Weekly Budgeting (Rp 250.000 / week -> 14 weeks)',
  },
  {
    name: 'Demo · Monthly Allocation (Monthly Cadence)',
    targetPrice: 18_000_000,
    currencyCode: 'IDR',
    targetDate: null,
    contributionAmount: 1_500_000,
    contributionCadence: 'monthly',
    descriptionState: 'Contribution to Time: Monthly Allocation (Rp 1.500.000 / month -> 12 months)',
  },
  {
    name: 'Demo · Target Date Deadline (Countdown)',
    targetPrice: 12_000_000,
    currencyCode: 'IDR',
    targetDate: '2026-12-31',
    contributionAmount: null,
    contributionCadence: null,
    descriptionState: 'Target Date to Contribution: Countdown Deadline (Target 2026-12-31)',
  },
  {
    name: 'Demo · Hybrid Pacing & Target Date (Dual Mode)',
    targetPrice: 16_000_000,
    currencyCode: 'IDR',
    targetDate: '2027-04-30',
    contributionAmount: 500_000,
    contributionCadence: 'weekly',
    descriptionState: 'Hybrid / Comprehensive: Both Target Date and Fixed Weekly Contribution',
  },
  {
    name: 'Demo · Multi-Currency USD (Weekly Cadence)',
    targetPrice: 150,
    currencyCode: 'USD',
    targetDate: null,
    contributionAmount: 15,
    contributionCadence: 'weekly',
    descriptionState: 'Multi-Currency Variant: USD Currency Formatting ($150 target, $15 / week)',
  },
];

const targetUserIdentifiers = ['dev-local', 'legacy'];

function executeWithNodeSqlite(databasePath) {
  const { DatabaseSync } = require('node:sqlite');
  const databaseConnection = new DatabaseSync(databasePath);

  const currentTimestamp = new Date().toISOString();

  databaseConnection.exec('PRAGMA foreign_keys = ON;');

  const deleteSpecificItemStatement = databaseConnection.prepare(
    'DELETE FROM planned_purchases WHERE user_id = ? AND name = ?'
  );

  const insertPlannedPurchaseStatement = databaseConnection.prepare(`
    INSERT INTO planned_purchases (
      user_id,
      name,
      target_price_micros,
      currency_code,
      target_date,
      contribution_amount_micros,
      contribution_cadence,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const userIdentifier of targetUserIdentifiers) {
    console.log(`[info] Seeding planned purchases for user: ${userIdentifier}`);

    // Clean up previous item names if they exist
    for (const previousName of previousItemNamesToClean) {
      deleteSpecificItemStatement.run(userIdentifier, previousName);
    }

    for (const seedItem of plannedPurchaseSeedItems) {
      deleteSpecificItemStatement.run(userIdentifier, seedItem.name);

      const targetPriceMicros = Math.round(seedItem.targetPrice * MICROS_MULTIPLIER);
      const contributionAmountMicros = seedItem.contributionAmount
        ? Math.round(seedItem.contributionAmount * MICROS_MULTIPLIER)
        : null;

      insertPlannedPurchaseStatement.run(
        userIdentifier,
        seedItem.name,
        targetPriceMicros,
        seedItem.currencyCode,
        seedItem.targetDate,
        contributionAmountMicros,
        seedItem.contributionCadence,
        currentTimestamp,
        currentTimestamp
      );

      console.log(`  [success] Inserted "${seedItem.name}" (${seedItem.descriptionState})`);
    }
  }

  databaseConnection.close();
}

function executeWithSqliteCli(databasePath) {
  const currentTimestamp = new Date().toISOString();
  const sqlCommands = ['PRAGMA foreign_keys = ON;'];

  for (const userIdentifier of targetUserIdentifiers) {
    for (const previousName of previousItemNamesToClean) {
      sqlCommands.push(
        `DELETE FROM planned_purchases WHERE user_id = '${userIdentifier}' AND name = '${previousName}';`
      );
    }

    for (const seedItem of plannedPurchaseSeedItems) {
      const targetPriceMicros = Math.round(seedItem.targetPrice * MICROS_MULTIPLIER);
      const contributionAmountMicros = seedItem.contributionAmount
        ? Math.round(seedItem.contributionAmount * MICROS_MULTIPLIER)
        : 'NULL';
      const targetDateValue = seedItem.targetDate ? `'${seedItem.targetDate}'` : 'NULL';
      const cadenceValue = seedItem.contributionCadence ? `'${seedItem.contributionCadence}'` : 'NULL';

      sqlCommands.push(
        `DELETE FROM planned_purchases WHERE user_id = '${userIdentifier}' AND name = '${seedItem.name}';`
      );
      sqlCommands.push(`
        INSERT INTO planned_purchases (
          user_id,
          name,
          target_price_micros,
          currency_code,
          target_date,
          contribution_amount_micros,
          contribution_cadence,
          created_at,
          updated_at
        ) VALUES (
          '${userIdentifier}',
          '${seedItem.name}',
          ${targetPriceMicros},
          '${seedItem.currencyCode}',
          ${targetDateValue},
          ${contributionAmountMicros},
          ${cadenceValue},
          '${currentTimestamp}',
          '${currentTimestamp}'
        );
      `);
    }
  }

  const result = spawnSync('sqlite3', [databasePath], {
    input: sqlCommands.join('\n'),
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(`sqlite3 CLI failed: ${result.stderr}`);
  }

  console.log('[success] Successfully seeded planned purchases via sqlite3 CLI.');
}

function seedPlannedPurchases() {
  if (!fs.existsSync(databaseFilePath)) {
    console.error(`[error] Database file not found at: ${databaseFilePath}`);
    console.error('[hint] Run backend first to initialize the database schema.');
    process.exit(1);
  }

  console.log(`[info] Target SQLite database: ${databaseFilePath}`);

  let succeeded = false;
  try {
    executeWithNodeSqlite(databaseFilePath);
    succeeded = true;
  } catch (nodeSqliteError) {
    console.warn(`[warn] node:sqlite error (${nodeSqliteError.message}), attempting sqlite3 CLI...`);
    try {
      executeWithSqliteCli(databaseFilePath);
      succeeded = true;
    } catch (cliError) {
      console.error(`[error] Failed to seed using sqlite3 CLI: ${cliError.message}`);
      process.exit(1);
    }
  }

  if (succeeded) {
    console.log('[success] Seeding completed successfully. All 7 demo case states are populated!');
  }
}

seedPlannedPurchases();
