import { create } from 'zustand';

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
        const resp = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const json = await resp.json();
        if (json.code !== 200) throw new Error(json.message || '登录失败');
        const { token, role } = json.data;
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
