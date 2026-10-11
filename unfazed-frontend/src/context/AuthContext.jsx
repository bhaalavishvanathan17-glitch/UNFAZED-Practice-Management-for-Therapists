import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [therapist, setTherapist] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('unfazed_token'));
  const [loading, setLoading] = useState(true);

  // Fetch current therapist profile if a token exists
  useEffect(() => {
    const fetchMe = async () => {
      const storedToken = localStorage.getItem('unfazed_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/api/auth/me');
        if (res.data?.data?.therapist) {
          setTherapist(res.data.data.therapist);
        }
      } catch (err) {
        console.warn('Session expired or invalid token:', err?.response?.data?.message || err.message);
        localStorage.removeItem('unfazed_token');
        setToken(null);
        setTherapist(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, []);

  const login = (therapistData, authToken) => {
    localStorage.setItem('unfazed_token', authToken);
    setToken(authToken);
    setTherapist(therapistData);
  };

  const logout = () => {
    localStorage.removeItem('unfazed_token');
    setToken(null);
    setTherapist(null);
  };

  const updateTherapistState = (updatedData) => {
    setTherapist(updatedData);
  };

  return (
    <AuthContext.Provider
      value={{
        therapist,
        token,
        isAuthenticated: !!token && !!therapist,
        loading,
        login,
        logout,
        updateTherapistState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
