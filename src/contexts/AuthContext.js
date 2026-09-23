import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  ApiError,
  getCurrentUser,
  getGoogleLoginUrl,
  logoutCurrentUser
} from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    const loadCurrentUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (active) {
          setUser(currentUser);
          setError(null);
        }
      } catch (loadError) {
        if (!active) {
          return;
        }

        if (loadError instanceof ApiError && loadError.status === 401) {
          setUser(null);
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

  const signIn = () => {
    window.location.assign(getGoogleLoginUrl());
  };

  const signOut = async () => {
    try {
      await logoutCurrentUser();
      setUser(null);
      setError(null);
    } catch (logoutError) {
      setError(logoutError);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, error, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
