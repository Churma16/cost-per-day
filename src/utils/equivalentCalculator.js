import { normalizeCurrencyCode } from './currencyConfig';

export const PRESENTATION_MODES = {
  DAILY_UNITS: 'DAILY_UNITS',
  EVERY_N_DAYS: 'EVERY_N_DAYS',
  MONTHLY_UNITS: 'MONTHLY_UNITS'
};

export const DAYS_IN_MONTH_CONVENTION = 30;

/**
 * Calculates raw derived unit values from cost-per-day and an equivalent's price amount.
 */
export const calculateDerivedEquivalentValues = (costPerDay, equivalentAmount) => {
  const numericCostPerDay = Number(costPerDay);
  const numericEquivalentAmount = Number(equivalentAmount);

  if (
    !Number.isFinite(numericCostPerDay) ||
    numericCostPerDay <= 0 ||
    !Number.isFinite(numericEquivalentAmount) ||
    numericEquivalentAmount <= 0
  ) {
    return null;
  }

  const unitsPerDay = numericCostPerDay / numericEquivalentAmount;
  const daysPerUnit = numericEquivalentAmount / numericCostPerDay;
  const unitsPerMonth = (numericCostPerDay * DAYS_IN_MONTH_CONVENTION) / numericEquivalentAmount;

  return {
    unitsPerDay,
    daysPerUnit,
    unitsPerMonth
  };
};

/**
 * Formats numeric quantities cleanly:
 * Whole or near-whole numbers are rendered as integers, otherwise at most 1 decimal digit.
 */
export const formatEquivalentQuantity = (quantity) => {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return '0';
  }

  const roundedInteger = Math.round(quantity);
  if (Math.abs(quantity - roundedInteger) < 0.05) {
    return String(roundedInteger);
  }

  return quantity.toFixed(1).replace(/\.0$/, '');
};

/**
 * Evaluates candidate presentation mode and formatted text for a single equivalent.
 */
export const formatEquivalentCandidate = (derivedValues, equivalent, translationFunction = null) => {
  if (!derivedValues || !equivalent) {
    return null;
  }

  const { unitsPerDay, daysPerUnit, unitsPerMonth } = derivedValues;
  const equivalentName = equivalent.name || '';

  // Case 1: At least 1 unit per day (e.g. "2 gorengan/day", "1 coffee/day")
  if (unitsPerDay >= 0.95) {
    const formattedQuantity = formatEquivalentQuantity(unitsPerDay);
    const displayText = translationFunction
      ? translationFunction('equivalentPerDay', { count: formattedQuantity, name: equivalentName })
      : `${formattedQuantity} ${equivalentName}/day`;

    return {
      mode: PRESENTATION_MODES.DAILY_UNITS,
      rawQuantity: unitsPerDay,
      formattedQuantity,
      daysCount: 1,
      text: displayText
    };
  }

  // Case 2: Less than 1 unit per day
  // Prefer "1 unit every N days" for intervals up to 14 days (or up to 60 days if monthly < 1)
  const roundedDays = Math.max(1, Math.round(daysPerUnit));

  if (roundedDays <= 1) {
    const displayText = translationFunction
      ? translationFunction('equivalentPerDay', { count: '1', name: equivalentName })
      : `1 ${equivalentName}/day`;

    return {
      mode: PRESENTATION_MODES.DAILY_UNITS,
      rawQuantity: 1,
      formattedQuantity: '1',
      daysCount: 1,
      text: displayText
    };
  }

  if (roundedDays <= 14 || unitsPerMonth < 1) {
    const displayText = translationFunction
      ? translationFunction('equivalentEveryNDays', { count: roundedDays, name: equivalentName })
      : `1 ${equivalentName} every ${roundedDays} days`;

    return {
      mode: PRESENTATION_MODES.EVERY_N_DAYS,
      rawQuantity: roundedDays,
      formattedQuantity: String(roundedDays),
      daysCount: roundedDays,
      text: displayText
    };
  }

  // Case 3: Monthly phrasing (e.g. "7.5 mie ayam/month")
  const formattedMonthlyQuantity = formatEquivalentQuantity(unitsPerMonth);
  const displayText = translationFunction
    ? translationFunction('equivalentPerMonth', { count: formattedMonthlyQuantity, name: equivalentName })
    : `${formattedMonthlyQuantity} ${equivalentName}/month`;

  return {
    mode: PRESENTATION_MODES.MONTHLY_UNITS,
    rawQuantity: unitsPerMonth,
    formattedQuantity: formattedMonthlyQuantity,
    daysCount: DAYS_IN_MONTH_CONVENTION,
    text: displayText
  };
};

/**
 * Calculates a readability fitness distance score (lower is better / more readable).
 */
export const calculateReadabilityScore = (candidate, derivedValues) => {
  if (!candidate || !derivedValues) {
    return Infinity;
  }

  let distanceScore = 0;

  if (candidate.mode === PRESENTATION_MODES.DAILY_UNITS) {
    // Favor daily numbers near 1 to 5 units
    distanceScore = Math.abs(derivedValues.unitsPerDay - 1);
    const decimalRemainder = Math.abs(derivedValues.unitsPerDay - Math.round(derivedValues.unitsPerDay));
    distanceScore += decimalRemainder * 0.4;
  } else if (candidate.mode === PRESENTATION_MODES.EVERY_N_DAYS) {
    // Favor intervals near 2 to 7 days
    const roundedDays = candidate.daysCount;
    distanceScore = Math.abs(roundedDays - 2) * 0.8 + 0.5;
  } else {
    // Monthly mode
    distanceScore = Math.abs(derivedValues.unitsPerMonth - 5) * 0.5 + 2.5;
    const decimalRemainder = Math.abs(derivedValues.unitsPerMonth - Math.round(derivedValues.unitsPerMonth));
    distanceScore += decimalRemainder * 0.5;
  }

  return distanceScore;
};

/**
 * Deterministically selects the best human-readable equivalent for a given item's cost-per-day.
 * Filters strictly by active currency and returns null if no valid match exists.
 */
export const selectBestEquivalent = (costPerDay, equivalentList, activeCurrencyCode, translationFunction = null) => {
  const numericCostPerDay = Number(costPerDay);
  if (!Number.isFinite(numericCostPerDay) || numericCostPerDay <= 0) {
    return null;
  }

  if (!Array.isArray(equivalentList) || equivalentList.length === 0) {
    return null;
  }

  const normalizedActiveCurrency = normalizeCurrencyCode(activeCurrencyCode);

  const matchingEquivalents = equivalentList.filter((equivalentItem) => {
    if (!equivalentItem || !equivalentItem.name || !equivalentItem.amount || Number(equivalentItem.amount) <= 0) {
      return false;
    }
    const equivalentCurrency = normalizeCurrencyCode(equivalentItem.currencyCode);
    return equivalentCurrency === normalizedActiveCurrency;
  });

  if (matchingEquivalents.length === 0) {
    return null;
  }

  const scoredCandidates = [];

  for (const equivalentItem of matchingEquivalents) {
    const derivedValues = calculateDerivedEquivalentValues(numericCostPerDay, equivalentItem.amount);
    if (!derivedValues) {
      continue;
    }

    const presentation = formatEquivalentCandidate(derivedValues, equivalentItem, translationFunction);
    if (!presentation) {
      continue;
    }

    const readabilityScore = calculateReadabilityScore(presentation, derivedValues);

    scoredCandidates.push({
      equivalent: equivalentItem,
      presentation,
      readabilityScore
    });
  }

  if (scoredCandidates.length === 0) {
    return null;
  }

  scoredCandidates.sort((firstCandidate, secondCandidate) => {
    if (Math.abs(firstCandidate.readabilityScore - secondCandidate.readabilityScore) > 0.0001) {
      return firstCandidate.readabilityScore - secondCandidate.readabilityScore;
    }

    const nameComparison = firstCandidate.equivalent.name.localeCompare(secondCandidate.equivalent.name);
    if (nameComparison !== 0) {
      return nameComparison;
    }

    return String(firstCandidate.equivalent.id).localeCompare(String(secondCandidate.equivalent.id));
  });

  const bestSelected = scoredCandidates[0];

  return {
    equivalent: bestSelected.equivalent,
    mode: bestSelected.presentation.mode,
    text: bestSelected.presentation.text,
    rawQuantity: bestSelected.presentation.rawQuantity,
    formattedQuantity: bestSelected.presentation.formattedQuantity
  };
};
