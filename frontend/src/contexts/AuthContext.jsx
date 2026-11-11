import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('tastio_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      localStorage.removeItem('tastio_user');
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('tastio_token'));
  const [isLoading, setIsLoading] = useState(false);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('tastio_user', JSON.stringify(userData));
    localStorage.setItem('tastio_token', authToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('tastio_user');
    localStorage.removeItem('tastio_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
