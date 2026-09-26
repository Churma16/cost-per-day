import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  ApiError,
  getCurrentUser,
  getGoogleLoginUrl,
  logoutCurrentUser
} from '../services/api';
import { guestMigrationService } from '../services/guestMigrationService';

export const GUEST_MODE_STORAGE_KEY = 'worthwhile:guest-mode';

const readGuestMode = () => {
  try {
    return window.localStorage.getItem(GUEST_MODE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const writeGuestMode = (enabled) => {
  try {
    if (enabled) {
      window.localStorage.setItem(GUEST_MODE_STORAGE_KEY, '1');
    } else {
      window.localStorage.removeItem(GUEST_MODE_STORAGE_KEY);
    }
  } catch {
    // Guest persistence still lives in IndexedDB; this marker only restores navigation mode.
  }
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [guestMigrationError, setGuestMigrationError] = useState(null);
  const [isMigratingGuestData, setIsMigratingGuestData] = useState(false);

  useEffect(() => {
    let active = true;

    const loadCurrentUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!active) return;

        setUser(currentUser);
        setIsGuest(false);
        setError(null);

        if (readGuestMode()) {
          setIsMigratingGuestData(true);
          try {
            await guestMigrationService.migrate();
            if (active) {
              writeGuestMode(false);
              setGuestMigrationError(null);
            }
          } catch (migrationError) {
            if (active) {
              setGuestMigrationError(migrationError);
            }
          } finally {
            if (active) {
              setIsMigratingGuestData(false);
            }
          }
        }
      } catch (loadError) {
        if (!active) {
          return;
        }

        if (loadError instanceof ApiError && loadError.status === 401) {
          setUser(null);
          setIsGuest(readGuestMode());
          setError(null);
        } else {
          setUser(null);
          setError(loadError);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadCurrentUser();

    return () => {
      active = false;
    };
  }, []);

  const continueAsGuest = () => {
    writeGuestMode(true);
    setIsGuest(true);
    setError(null);
  };

  const signIn = () => {
    window.location.assign(getGoogleLoginUrl());
  };

  const retryGuestMigration = async () => {
    if (!user || !readGuestMode()) return null;

    setIsMigratingGuestData(true);
    setGuestMigrationError(null);
    try {
      const result = await guestMigrationService.migrate();
      writeGuestMode(false);
      return result;
    } catch (migrationError) {
      setGuestMigrationError(migrationError);
      return null;
    } finally {
      setIsMigratingGuestData(false);
    }
  };

  const signOut = async () => {
    try {
      await logoutCurrentUser();
      setUser(null);
      setIsGuest(readGuestMode());
      setError(null);
    } catch (logoutError) {
      setError(logoutError);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isGuest,
      isLoading,
      error,
      signIn,
      signOut,
      continueAsGuest,
      guestMigrationError,
      isMigratingGuestData,
      retryGuestMigration,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
