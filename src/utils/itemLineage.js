const normalizeItemId = (value) => (
  value === null || value === undefined ? null : String(value)
);

const sortByPurchaseDateThenId = (left, right) => {
  const leftTime = Date.parse(left?.purchaseDate || '');
  const rightTime = Date.parse(right?.purchaseDate || '');

  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  return String(left?.id ?? '').localeCompare(String(right?.id ?? ''));
};

export const getOwnershipJourneyContext = (items, item) => {
  const safeItems = Array.isArray(items) ? items : [];
  const currentItemId = normalizeItemId(item?.id);

  if (!currentItemId) {
    return {
      previousItem: null,
      nextItems: [],
      hasJourney: false,
    };
  }

  const itemsById = new Map(
    safeItems
      .filter((candidate) => candidate?.id !== null && candidate?.id !== undefined)
      .map((candidate) => [normalizeItemId(candidate.id), candidate]),
  );

  const previousItemId = normalizeItemId(item?.replacesItemId);
  const previousItem = previousItemId ? itemsById.get(previousItemId) ?? null : null;
  const nextItems = safeItems
    .filter(
      (candidate) => normalizeItemId(candidate?.replacesItemId) === currentItemId,
    )
    .sort(sortByPurchaseDateThenId);

  return {
    previousItem,
    nextItems,
    hasJourney: Boolean(previousItem || nextItems.length > 0),
  };
};

export const buildOwnershipJourney = (items, item) => {
  const safeItems = Array.isArray(items) ? items : [];
  const currentItemId = normalizeItemId(item?.id);

  if (!currentItemId) {
    return [];
  }

  const itemsById = new Map(
    safeItems
      .filter((candidate) => candidate?.id !== null && candidate?.id !== undefined)
      .map((candidate) => [normalizeItemId(candidate.id), candidate]),
  );
  const currentItem = itemsById.get(currentItemId) ?? item;
  const visited = new Set([currentItemId]);
  const before = [];

  let cursor = currentItem;
  while (cursor?.replacesItemId !== null && cursor?.replacesItemId !== undefined) {
    const previousItemId = normalizeItemId(cursor.replacesItemId);
    if (!previousItemId || visited.has(previousItemId)) {
      break;
    }

    const previousItem = itemsById.get(previousItemId);
    if (!previousItem) {
      break;
    }

    visited.add(previousItemId);
    before.unshift(previousItem);
    cursor = previousItem;
  }

  const after = [];
  cursor = currentItem;

  while (cursor) {
    const cursorId = normalizeItemId(cursor.id);
    const nextCandidates = safeItems
      .filter(
        (candidate) => normalizeItemId(candidate?.replacesItemId) === cursorId,
      )
      .filter((candidate) => !visited.has(normalizeItemId(candidate?.id)))
      .sort(sortByPurchaseDateThenId);

    if (nextCandidates.length === 0) {
      break;
    }

    // A replacement journey is expected to be linear. If historical data ever
    // branches, keep every directly linked item visible rather than inventing
    // an arbitrary sequence beyond that branch.
    if (nextCandidates.length > 1) {
      after.push(...nextCandidates);
      break;
    }

    const nextItem = nextCandidates[0];
    const nextItemId = normalizeItemId(nextItem.id);
    visited.add(nextItemId);
    after.push(nextItem);
    cursor = nextItem;
  }

  return [...before, currentItem, ...after];
};
