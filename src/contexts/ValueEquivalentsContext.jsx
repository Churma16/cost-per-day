import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getAllValueEquivalents,
  createValueEquivalent,
  updateValueEquivalent,
  deleteValueEquivalent
} from '../services/api';

const ValueEquivalentsContext = createContext();

export const ValueEquivalentsProvider = ({ children }) => {
  const [valueEquivalents, setValueEquivalents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadEquivalents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getAllValueEquivalents();
      setValueEquivalents(data);
    } catch (loadError) {
      console.error('Error loading value equivalents:', loadError);
      setError(loadError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEquivalents();
  }, [loadEquivalents]);

  const addEquivalent = async (equivalentData) => {
    try {
      setError(null);
      const created = await createValueEquivalent(equivalentData);
      setValueEquivalents((previousEquivalents) => [...previousEquivalents, created]);
      return created;
    } catch (createError) {
      console.error('Error creating value equivalent:', createError);
      setError(createError);
      throw createError;
    }
  };

  const editEquivalent = async (id, equivalentData) => {
    try {
      setError(null);
      const updated = await updateValueEquivalent(id, equivalentData);
      setValueEquivalents((previousEquivalents) =>
        previousEquivalents.map((item) => (String(item.id) === String(id) ? updated : item))
      );
      return updated;
    } catch (updateError) {
      console.error('Error updating value equivalent:', updateError);
      setError(updateError);
      throw updateError;
    }
  };

  const removeEquivalent = async (id) => {
    try {
      setError(null);
      await deleteValueEquivalent(id);
      setValueEquivalents((previousEquivalents) =>
        previousEquivalents.filter((item) => String(item.id) !== String(id))
      );
    } catch (deleteError) {
      console.error('Error deleting value equivalent:', deleteError);
      setError(deleteError);
      throw deleteError;
    }
  };

  return (
    <ValueEquivalentsContext.Provider
      value={{
        valueEquivalents,
        isLoading,
        error,
        addEquivalent,
        editEquivalent,
        removeEquivalent,
        refreshEquivalents: loadEquivalents
      }}
    >
      {children}
    </ValueEquivalentsContext.Provider>
  );
};

export const useValueEquivalents = () => {
  const context = useContext(ValueEquivalentsContext);
  if (!context) {
    throw new Error('useValueEquivalents must be used within a ValueEquivalentsProvider');
  }
  return context;
};
