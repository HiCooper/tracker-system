import { create } from 'zustand';
import apiClient from '../services/api';

interface AuthState {
  token: string | null;
  username: string | null;
  role: string | null;
  loading: boolean;

  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: () => boolean;
  getToken: () => string | null;
}

/**
 * Token stored in sessionStorage (cleared on tab close) rather than localStorage
 * to limit XSS exfiltration window. For production, migrate to httpOnly cookies
 * set by the backend with SameSite=Strict.
 */
const TOKEN_KEY = 'gateflow_token';
const USER_KEY = 'gateflow_user';
const ROLE_KEY = 'gateflow_role';

function loadPersisted(): { token: string | null; username: string | null; role: string | null } {
  return {
    token: sessionStorage.getItem(TOKEN_KEY),
    username: localStorage.getItem(USER_KEY),
    role: localStorage.getItem(ROLE_KEY),
  };
}

export const useAuthStore = create<AuthState>((set, get) => {
  const persisted = loadPersisted();
  return {
    token: persisted.token,
    username: persisted.username,
    role: persisted.role,
    loading: false,

    login: async (username, password) => {
      set({ loading: true });
      try {
        // apiClient response interceptor unwraps ApiResponse.data automatically
        const res = await apiClient.post('/v1/auth/login', { username, password });
        const { token, role } = res.data as { token: string; role: string };
        sessionStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, username);
        localStorage.setItem(ROLE_KEY, role);
        set({ token, username, role, loading: false });
      } catch (err) {
        set({ loading: false });
        throw err;
      }
    },

    logout: () => {
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(ROLE_KEY);
      set({ token: null, username: null, role: null });
    },

    isAuthenticated: () => !!get().token,

    getToken: () => get().token,
  };
});
