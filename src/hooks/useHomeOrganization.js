import { useCallback, useMemo, useState } from 'react';
import {
  loadHomeOrganization,
  normalizeHomeOrganization,
  organizeItems,
  saveHomeOrganization,
} from '../utils/itemOrganization';

export const useHomeOrganization = (items = [], locale) => {
  const [organization, setOrganizationState] = useState(loadHomeOrganization);

  const setOrganization = useCallback((nextOrganization) => {
    const normalized = normalizeHomeOrganization(nextOrganization);
    setOrganizationState(normalized);
    saveHomeOrganization(normalized);
  }, []);

  const organizedGroups = useMemo(
    () => organizeItems(items, organization, locale),
    [items, organization, locale]
  );

  const visibleItemCount = useMemo(
    () => organizedGroups.reduce((count, group) => count + group.items.length, 0),
    [organizedGroups]
  );

  return {
    organization,
    organizedGroups,
    visibleItemCount,
    setOrganization,
  };
};
