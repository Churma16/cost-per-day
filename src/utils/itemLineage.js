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

const buildSuccessorTree = (items, parentItem, blockedIds) => {
  const parentId = normalizeItemId(parentItem?.id);
  if (!parentId) return [];

  return items
    .filter(
      (candidate) => normalizeItemId(candidate?.replacesItemId) === parentId,
    )
    .filter((candidate) => !blockedIds.has(normalizeItemId(candidate?.id)))
    .sort(sortByPurchaseDateThenId)
    .map((candidate) => {
      const candidateId = normalizeItemId(candidate.id);
      const nextBlockedIds = new Set(blockedIds);
      nextBlockedIds.add(candidateId);

      return {
        item: candidate,
        successors: buildSuccessorTree(items, candidate, nextBlockedIds),
      };
    });
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
    return {
      ancestors: [],
      currentItem: item ?? null,
      successors: [],
    };
  }

  const itemsById = new Map(
    safeItems
      .filter((candidate) => candidate?.id !== null && candidate?.id !== undefined)
      .map((candidate) => [normalizeItemId(candidate.id), candidate]),
  );
  const currentItem = itemsById.get(currentItemId) ?? item;
  const visited = new Set([currentItemId]);
  const ancestors = [];

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
    ancestors.unshift(previousItem);
    cursor = previousItem;
  }

  return {
    ancestors,
    currentItem,
    successors: buildSuccessorTree(safeItems, currentItem, visited),
  };
};
