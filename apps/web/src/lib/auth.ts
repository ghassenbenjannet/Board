import { create } from 'zustand';
import { api } from './api';

type User = { id: string; email: string; name: string };

type AuthStore = {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loadMe: () => Promise<void>;
};

export const useAuth = create<AuthStore>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    set({ token: data.token, user: data.user });
  },
  async register(name, email, password) {
    const { data } = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('token', data.token);
    set({ token: data.token, user: data.user });
  },
  logout() {
    localStorage.removeItem('token');
    set({ token: null, user: null });
  },
  async loadMe() {
    if (!get().token) return;
    const { data } = await api.get('/auth/me');
    set({ user: data });
  }
}));
