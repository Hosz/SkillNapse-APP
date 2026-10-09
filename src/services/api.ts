const SERVER_ORIGIN = import.meta.env.VITE_SERVER_ORIGIN || 'http://localhost:8080';

export class ApiService {
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
    const token = this.getToken();
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

    // Handle 401 Unauthorized via Refresh Token (Section 3.3 of FRONTEND_INTEGRATION_GUIDE.md)
    if (response.status === 401 && !isRetry && !endpoint.includes('/auth/')) {
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${SERVER_ORIGIN}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            if (data?.accessToken) {
              this.setToken(data.accessToken);
              if (data?.refreshToken) {
                this.setRefreshToken(data.refreshToken);
              }
              // Retry original request with new token
              return this.request<T>(endpoint, options, true);
            }
          }
        } catch {
          this.clearTokens();
        }
      }
      this.clearTokens();
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.message || `Erro HTTP ${response.status}`);
    }

    return response.json();
  }
}
