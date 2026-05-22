import { create } from 'zustand';
import api from '../services/api';

const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,

  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const user = await api.auth.login(username, password);
      if (user) {
        set({ user, isAuthenticated: true, loading: false });
        return true;
      } else {
        set({ error: 'Usuário ou senha incorretos.', loading: false });
        return false;
      }
    } catch (err) {
      set({ error: err.message || 'Erro ao realizar login', loading: false });
      return false;
    }
  },

  logout: async () => {
    const user = get().user;
    if (user) {
      await api.auth.logAcao(user.id, 'LOGOUT', `Usuário ${user.username} efetuou logout`);
    }
    set({ user: null, isAuthenticated: false });
  },

  logAction: async (acao, detalhes) => {
    const user = get().user;
    if (user) {
      await api.auth.logAcao(user.id, acao, detalhes);
    }
  }
}));

export default useAuthStore;
