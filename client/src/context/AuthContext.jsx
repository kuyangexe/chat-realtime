import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { initSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('chat_token') || null);
  const [loading, setLoading] = useState(true);

  // Check login on load
  useEffect(() => {
    async function checkAuth() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        setUser(res.data);
        initSocket(token);
      } catch (err) {
        console.error('Auth verification failed:', err);
        logout();
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [token]);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('chat_token', newToken);
    setToken(newToken);
    setUser(userData);
    initSocket(newToken);
    return userData;
  };

  const register = async (username, password, displayName) => {
    const res = await api.post('/auth/register', { username, password, displayName });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('chat_token', newToken);
    setToken(newToken);
    setUser(userData);
    initSocket(newToken);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('chat_token');
    setToken(null);
    setUser(null);
    disconnectSocket();
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
