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

export interface RegistroResponse {
  id: string;
  nome: string;
  email: string;
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
        if (res.refreshToken) {
          ApiService.setRefreshToken(res.refreshToken);
        }
        localStorage.setItem('skillnapse_user', JSON.stringify({ email: payload.email }));
      }
      return res;
    } catch {
      return null;
    }
  },

  async registrar(payload: RegistroPayload): Promise<LoginResponse | null> {
    try {
      await ApiService.request<RegistroResponse>('/auth/registro', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      // Realiza login automatico com as credenciais cadastradas
      return await this.login({ email: payload.email, senha: payload.senha });
    } catch {
      // Fallback local caso offline
      localStorage.setItem('skillnapse_user', JSON.stringify({ email: payload.email, nome: payload.nome }));
      return {
        accessToken: `local-${Date.now()}`,
        refreshToken: `refresh-${Date.now()}`,
        tokenType: 'Bearer',
        expiresIn: 3600,
      };
    }
  },

  async register(payload: RegistroPayload): Promise<LoginResponse | null> {
    return this.registrar(payload);
  },

  async obterUsuarioAtual(): Promise<UsuarioMe | null> {
    try {
      const saved = localStorage.getItem('skillnapse_user');
      return saved ? JSON.parse(saved) : { id: 'usr-1', nome: 'Hokyozu', email: 'hokyozu@skillnapse.com' };
    } catch {
      return { id: 'usr-1', nome: 'Hokyozu', email: 'hokyozu@skillnapse.com' };
    }
  },

  logout() {
    ApiService.clearTokens();
  },
};
