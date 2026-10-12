const SERVER_ORIGIN = import.meta.env.VITE_SERVER_ORIGIN || 'http://localhost:8080';

export class AiQuotaExceededFrontendError extends Error {
  readonly isQuotaExceeded = true;
  constructor(message?: string) {
    super(message || 'A cota diária de requisições de Inteligência Artificial foi atingida no provedor.');
    this.name = 'AiQuotaExceededFrontendError';
  }
}

export function isQuotaExceededError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof AiQuotaExceededFrontendError) return true;
  if (typeof error === 'object' && error !== null && 'isQuotaExceeded' in error) return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('cota') ||
      msg.includes('quota') ||
      msg.includes('429') ||
      msg.includes('resource_exhausted') ||
      msg.includes('rate limit')
    );
  }
  return false;
}

export function isTokenExpired(token: string | null, bufferSeconds = 60): boolean {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;
    const expirationMs = payload.exp * 1000;
    return expirationMs - Date.now() <= bufferSeconds * 1000;
  } catch {
    return true;
  }
}

export class ApiService {
  private static refreshPromise: Promise<string | null> | null = null;

  public static getToken(): string | null {
    return localStorage.getItem('skillnapse_access_token');
  }

  public static setToken(token: string) {
    localStorage.setItem('skillnapse_access_token', token);
  }

  public static getRefreshToken(): string | null {
    return localStorage.getItem('skillnapse_refresh_token');
  }

  public static setRefreshToken(refreshToken: string) {
    localStorage.setItem('skillnapse_refresh_token', refreshToken);
  }

  public static clearTokens() {
    localStorage.removeItem('skillnapse_access_token');
    localStorage.removeItem('skillnapse_refresh_token');
    localStorage.removeItem('skillnapse_user');
  }

  /**
   * Executa a renovação do access token via refresh token com bloqueio de concorrência (Single-Flight).
   * Se múltiplas requisições receberem 401 ou detectarem expiração simultaneamente,
   * apenas uma chamada HTTP a /auth/refresh é realizada, prevenindo falsos positivos de Token Reuse (RFC 6819).
   */
  public static async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.clearTokens();
      window.dispatchEvent(new CustomEvent('skillnapse:unauthorized'));
      return null;
    }

    this.refreshPromise = (async () => {
      try {
        const refreshRes = await fetch(`${SERVER_ORIGIN}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          if (data?.accessToken) {
            this.setToken(data.accessToken);
            if (data?.refreshToken) {
              this.setRefreshToken(data.refreshToken);
            }
            return data.accessToken;
          }
        }

        // Se o refresh token falhou (401/400/revogado/expirado há mais de 7 dias), desloga
        this.clearTokens();
        window.dispatchEvent(new CustomEvent('skillnapse:unauthorized'));
        return null;
      } catch {
        this.clearTokens();
        window.dispatchEvent(new CustomEvent('skillnapse:unauthorized'));
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private static resolveUrl(endpoint: string): string {
    if (endpoint.startsWith('http')) return endpoint;
    if (endpoint.startsWith('/auth')) return `${SERVER_ORIGIN}${endpoint}`;
    if (endpoint.startsWith('/api/v1')) return `${SERVER_ORIGIN}${endpoint}`;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${SERVER_ORIGIN}/api/v1${cleanEndpoint}`;
  }

  public static async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry = false
  ): Promise<T> {
    const isAuthRoute =
      endpoint.includes('/auth/login') ||
      endpoint.includes('/auth/registro') ||
      endpoint.includes('/auth/refresh');

    let token = this.getToken();

    // 1. Verificação preventiva: Se o token estiver expirado ou a 30s de expirar, renova antes de bater no backend
    if (!isAuthRoute && !isRetry) {
      if (isTokenExpired(token, 30)) {
        const refreshToken = this.getRefreshToken();
        if (refreshToken) {
          const novoToken = await this.refreshAccessToken();
          if (novoToken) {
            token = novoToken;
          }
        }
      }
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const targetUrl = this.resolveUrl(endpoint);

    const response = await fetch(targetUrl, {
      ...options,
      headers,
    });

    // 2. Verificação reativa: Se o servidor retornou 401 Unauthorized, tenta renovar via refresh token antes de deslogar
    if (response.status === 401 && !isRetry && !isAuthRoute) {
      const novoToken = await this.refreshAccessToken();
      if (novoToken) {
        // Repete a requisição original com o novo token de acesso
        return this.request<T>(endpoint, options, true);
      }
      throw new Error('Sessão expirada. Por favor, realize login novamente.');
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));

      // Detecta se a cota da IA foi atingida (429 ou código COTA_IA_ATINGIDA)
      if (
        response.status === 429 ||
        errorBody?.error === 'COTA_IA_ATINGIDA' ||
        errorBody?.code === 'COTA_IA_ATINGIDA' ||
        errorBody?.message?.toLowerCase().includes('cota') ||
        errorBody?.message?.toLowerCase().includes('quota') ||
        errorBody?.message?.toLowerCase().includes('rate limit') ||
        errorBody?.message?.toLowerCase().includes('resource_exhausted')
      ) {
        window.dispatchEvent(
          new CustomEvent('skillnapse:quota-exceeded', {
            detail: {
              message:
                errorBody?.message ||
                'A cota diária de requisições de Inteligência Artificial foi atingida no provedor.',
            },
          })
        );
        throw new AiQuotaExceededFrontendError(errorBody?.message);
      }

      throw new Error(errorBody.message || `Erro HTTP ${response.status}`);
    }

    if (response.status === 204 || response.status === 205) {
      return null as unknown as T;
    }

    const text = await response.text();
    if (!text || !text.trim()) {
      return null as unknown as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }
}
