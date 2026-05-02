import { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Validate JWT structure (must have 3 segments) before trusting the stored token
  const getValidToken = () => {
    const raw = localStorage.getItem('token');
    if (raw && raw.split('.').length === 3) return raw;
    if (raw) localStorage.removeItem('token'); // discard corrupted token
    return null;
  };

  const [token, setToken] = useState(getValidToken);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const userData = await getMe(token);
          setUser(userData);
        } catch (error) {
          console.error("Token verification failed:", error);
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const loginUser = (newToken, userData) => {
    if (!newToken || typeof newToken !== 'string' || newToken.split('.').length !== 3) {
      console.error('loginUser received invalid token:', newToken);
      return;
    }
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logoutUser = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loginUser, logoutUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
