export const deriveOwnershipTargetEquivalent = ({ price, targetType, targetValue }) => {
  const numericPrice = Number(price);
  const numericTargetValue = Number(targetValue);

  if (
    !Number.isFinite(numericPrice) ||
    numericPrice <= 0 ||
    !Number.isFinite(numericTargetValue) ||
    numericTargetValue <= 0
  ) {
    return null;
  }

  if (targetType === 'cost_per_day') {
    return {
      type: 'duration',
      value: Math.ceil(numericPrice / numericTargetValue)
    };
  }

  if (targetType === 'duration') {
    return {
      type: 'cost_per_day',
      value: numericPrice / numericTargetValue
    };
  }

  return null;
};
