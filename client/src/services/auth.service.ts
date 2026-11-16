import axios from 'axios';
import api from './api';

const API_URL = 'http://localhost:3000/api';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    nombreCompleto: string;
    rol: string;
  };
}

export interface JwtTokenClaims {
  userId?: string;
  username?: string;
  rol?: string;
  exp?: number;
}

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    // Login usa axios directo para evitar interceptor (no hay token aún)
    const response = await axios.post(`${API_URL}/auth/login`, credentials);
    return response.data.data;
  },

  async getCurrentUser() {
    // getCurrentUser usa api para incluir el token en headers
    const response = await api.get('/auth/me');
    return response.data.data;
  },

  getToken(): string | null {
    return localStorage.getItem('token');
  },

  setToken(token: string): void {
    localStorage.setItem('token', token);
  },

  removeToken(): void {
    localStorage.removeItem('token');
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  getTokenClaims(): JwtTokenClaims | null {
    const token = this.getToken();
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const parsed: unknown = JSON.parse(atob(padded));
      if (typeof parsed !== 'object' || parsed === null) return null;
      const record = parsed as Record<string, unknown>;
      return {
        userId: typeof record.userId === 'string' ? record.userId : undefined,
        username: typeof record.username === 'string' ? record.username : undefined,
        rol: typeof record.rol === 'string' ? record.rol : undefined,
        exp: typeof record.exp === 'number' ? record.exp : undefined,
      };
    } catch {
      return null;
    }
  },

  getRolFromToken(): string | null {
    return this.getTokenClaims()?.rol ?? null;
  },
};
