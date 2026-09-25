const OWNERSHIP_NOON_UTC_SUFFIX = 'T12:00:00.000Z';

export const normalizeOwnershipDate = (date) => {
  const normalizedDate = new Date(date);
  normalizedDate.setUTCHours(12, 0, 0, 0);
  return normalizedDate;
};

export const dateOnlyToOwnershipDate = (dateOnly) => {
  return new Date(`${dateOnly}${OWNERSHIP_NOON_UTC_SUFFIX}`);
};

export const dateOnlyToOwnershipTimestamp = (dateOnly) => {
  return dateOnlyToOwnershipDate(dateOnly).toISOString();
};

export const ownershipDateToDateOnly = (date) => {
  const ownershipDate = new Date(date);

  if (Number.isNaN(ownershipDate.getTime())) {
    return '';
  }

  return ownershipDate.toISOString().split('T')[0];
};

export const currentUTCDateOnly = (now = new Date()) => {
  return ownershipDateToDateOnly(now);
};
