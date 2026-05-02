import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { getMe, refreshToken as apiRefreshToken } from '../services/api';

const AuthContext = createContext();

// Decode JWT payload without verifying signature
function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

// Returns ms until token expires (negative = already expired)
function msUntilExpiry(token) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return -1;
  return payload.exp * 1000 - Date.now();
}

function isTokenValid(token) {
  if (!token || token.split('.').length !== 3) return false;
  return msUntilExpiry(token) > 0;
}

function getStored(key) {
  try { return localStorage.getItem(key) || ''; } catch { return ''; }
}
function setStored(key, val) {
  try { if (val) localStorage.setItem(key, val); else localStorage.removeItem(key); } catch {}
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    const t = getStored('token');
    return t && t.split('.').length === 3 ? t : '';
  });
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef(null);

  // Persist token to localStorage whenever it changes
  useEffect(() => {
    setStored('token', token);
  }, [token]);

  const clearAuth = useCallback(() => {
    setToken('');
    setUser(null);
    setStored('token', '');
    setStored('refresh_token', '');
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  }, []);

  // Schedule a token refresh 2 minutes before expiry
  const scheduleRefresh = useCallback((accessToken) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const ms = msUntilExpiry(accessToken) - 2 * 60 * 1000; // 2 min before expiry
    if (ms > 0) {
      refreshTimerRef.current = setTimeout(() => doRefresh(), ms);
    }
  }, []); // eslint-disable-line

  const doRefresh = useCallback(async () => {
    const storedRefresh = getStored('refresh_token');
    if (!storedRefresh) { clearAuth(); return null; }
    try {
      const data = await apiRefreshToken(storedRefresh);
      const newAccess = data.access_token;
      const newRefresh = data.refresh_token || storedRefresh;
      setToken(newAccess);
      setStored('token', newAccess);
      setStored('refresh_token', newRefresh);
      scheduleRefresh(newAccess);
      return newAccess;
    } catch {
      clearAuth();
      return null;
    }
  }, [clearAuth, scheduleRefresh]);

  // On mount: verify or refresh stored token
  useEffect(() => {
    const init = async () => {
      const storedToken = getStored('token');
      const storedRefresh = getStored('refresh_token');

      if (!storedToken || storedToken.split('.').length !== 3) {
        setLoading(false);
        return;
      }

      let activeToken = storedToken;

      // If access token expired but we have a refresh token, refresh first
      if (!isTokenValid(storedToken) && storedRefresh) {
        const refreshed = await doRefresh();
        if (!refreshed) { setLoading(false); return; }
        activeToken = refreshed;
      } else if (isTokenValid(storedToken)) {
        scheduleRefresh(storedToken);
      }

      // Verify token with backend
      try {
        const userData = await getMe(activeToken);
        setUser(userData);
        setToken(activeToken);
      } catch {
        clearAuth();
      }
      setLoading(false);
    };

    init();

    return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current); };
  }, []); // eslint-disable-line

  const loginUser = useCallback((newToken, userData, newRefreshToken) => {
    if (!newToken || newToken.split('.').length !== 3) {
      console.error('loginUser: invalid token');
      return;
    }
    setToken(newToken);
    setUser(userData);
    setStored('token', newToken);
    if (newRefreshToken) setStored('refresh_token', newRefreshToken);
    scheduleRefresh(newToken);
  }, [scheduleRefresh]);

  const logoutUser = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  return (
    <AuthContext.Provider value={{ user, token, loginUser, logoutUser, loading, doRefresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
