export const ESTIMATED_DAYS_PER_MONTH = 365 / 12;

const DAYS_PER_WEEK = 7;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const SUPPORTED_CADENCES = new Set(['daily', 'weekly', 'monthly']);

const toPositiveFiniteNumber = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }
  return numericValue;
};

const toUTCDateOnly = (value) => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
    );
  }

  if (typeof value !== 'string') {
    return null;
  }

  const parts = value.trim().split('-');
  if (parts.length !== 3) {
    return null;
  }

  const [year, month, day] = parts.map(Number);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  const utcDate = new Date(Date.UTC(year, month - 1, day));
  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day
  ) {
    return null;
  }

  return utcDate;
};

export const cadenceToEstimatedDays = (periods, cadence) => {
  const numericPeriods = toPositiveFiniteNumber(periods);
  if (numericPeriods === null || !SUPPORTED_CADENCES.has(cadence)) {
    return null;
  }

  const roundedPeriods = Math.ceil(numericPeriods);

  if (cadence === 'daily') {
    return roundedPeriods;
  }

  if (cadence === 'weekly') {
    return roundedPeriods * DAYS_PER_WEEK;
  }

  return Math.round(roundedPeriods * ESTIMATED_DAYS_PER_MONTH);
};

export const calculateContributionProjection = ({
  targetPrice,
  contributionAmount,
  cadence,
}) => {
  const numericTargetPrice = toPositiveFiniteNumber(targetPrice);
  const numericContributionAmount = toPositiveFiniteNumber(contributionAmount);

  if (
    numericTargetPrice === null ||
    numericContributionAmount === null ||
    !SUPPORTED_CADENCES.has(cadence)
  ) {
    return null;
  }

  const periods = Math.ceil(numericTargetPrice / numericContributionAmount);
  const estimatedDays = cadenceToEstimatedDays(periods, cadence);

  if (estimatedDays === null) {
    return null;
  }

  return {
    periods,
    estimatedDays,
  };
};

export const calculateTargetDateProjection = ({
  targetPrice,
  targetDate,
  asOf = new Date(),
}) => {
  const numericTargetPrice = toPositiveFiniteNumber(targetPrice);
  const targetDateUTC = toUTCDateOnly(targetDate);
  const asOfDateUTC = toUTCDateOnly(asOf);

  if (
    numericTargetPrice === null ||
    targetDateUTC === null ||
    asOfDateUTC === null
  ) {
    return null;
  }

  const millisecondsRemaining = targetDateUTC.getTime() - asOfDateUTC.getTime();
  const daysRemaining = Math.max(
    1,
    Math.ceil(millisecondsRemaining / MILLISECONDS_PER_DAY)
  );

  const daily = numericTargetPrice / daysRemaining;

  return {
    daysRemaining,
    daily,
    weekly: daily * DAYS_PER_WEEK,
    monthly: daily * ESTIMATED_DAYS_PER_MONTH,
  };
};

export const computeTargetDateFromEstimatedDays = (
  estimatedDays,
  asOf = new Date()
) => {
  const numericDays = toPositiveFiniteNumber(estimatedDays);
  if (numericDays === null) {
    return null;
  }
  const baseDate =
    asOf instanceof Date && !Number.isNaN(asOf.getTime())
      ? asOf
      : new Date();
  const calculatedTimestamp =
    baseDate.getTime() + Math.ceil(numericDays) * MILLISECONDS_PER_DAY;
  return new Date(calculatedTimestamp);
};
