import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

function loadFromStorage() {
  try {
    const token = localStorage.getItem('fb_token');
    const userStr = localStorage.getItem('fb_user');
    if (token && userStr) {
      return { user: JSON.parse(userStr), token, isAuthenticated: true };
    }
  } catch {}
  return { user: null, token: null, isAuthenticated: false };
}

export const useAuthStore = create<AuthState>((set) => ({
  ...loadFromStorage(),
  setAuth: (user, token) => {
    localStorage.setItem('fb_token', token);
    localStorage.setItem('fb_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('fb_token');
    localStorage.removeItem('fb_user');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
