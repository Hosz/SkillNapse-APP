import { ApiService, isTokenExpired } from './api';

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
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  },

  async verificarSessao(): Promise<UsuarioMe | null> {
    let token = ApiService.getToken();
    const refreshToken = ApiService.getRefreshToken();

    // Se não há token e nem refresh token, a sessão realmente não existe
    if (!token && !refreshToken) {
      this.logout();
      return null;
    }

    // Se o token estiver expirado ou ausente mas temos refresh token, renova proativamente
    if ((!token || isTokenExpired(token, 30)) && refreshToken) {
      const novoToken = await ApiService.refreshAccessToken();
      if (!novoToken) {
        this.logout();
        return null;
      }
      token = novoToken;
    }

    try {
      const me = await ApiService.request<UsuarioMe>('/auth/me');
      if (me && me.email) {
        const saved = localStorage.getItem('skillnapse_user');
        const current = saved ? JSON.parse(saved) : {};
        const merged = { ...current, id: me.id, email: me.email, nome: me.nome || current.nome };
        localStorage.setItem('skillnapse_user', JSON.stringify(merged));
        return merged;
      }
      this.logout();
      return null;
    } catch {
      this.logout();
      return null;
    }
  },

  logout() {
    ApiService.clearTokens();
    try {
      localStorage.removeItem('skillnapse_user');
    } catch {}
    window.dispatchEvent(new CustomEvent('skillnapse:unauthorized'));
  },
};
