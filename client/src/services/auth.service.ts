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
};
