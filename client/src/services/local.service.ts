import api from './api';
import type { ApiResponse, Local } from '@/types';

export const listarLocales = async (): Promise<Local[]> => {
  const response = await api.get<ApiResponse<Local[]>>('/locales');
  return Array.isArray(response.data.data) ? response.data.data : [];
};
