import { ApiService } from './api';

export interface LoginPayload {
  email: string;
  senha: string;
}

export interface RegistroPayload {
  nome: string;
  email: string;
  senha: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface UsuarioMe {
  id: string;
  nome: string;
  email: string;
}

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResponse | null> {
    try {
      const res = await ApiService.request<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res?.accessToken) {
        ApiService.setToken(res.accessToken);
        localStorage.setItem('skillnapse_user', JSON.stringify({ email: payload.email }));
      }
      return res;
    } catch {
      return null;
    }
  },

  async registrar(payload: RegistroPayload) {
    try {
      return await ApiService.request('/auth/registro', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch {
      return null;
    }
  },

  async obterUsuarioAtual(): Promise<UsuarioMe | null> {
    try {
      return await ApiService.request<UsuarioMe>('/auth/me');
    } catch {
      const saved = localStorage.getItem('skillnapse_user');
      return saved ? JSON.parse(saved) : { id: 'usr-1', nome: 'Hokyozu', email: 'hokyozu@skillnapse.com' };
    }
  },

  logout() {
    localStorage.removeItem('skillnapse_access_token');
    localStorage.removeItem('skillnapse_user');
  },
};
