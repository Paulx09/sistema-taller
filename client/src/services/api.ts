import axios from 'axios';

// Leer la URL del API desde variables de entorno
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Instancia de Axios configurada
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para requests (agregar token JWT)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

function formatResponseData(data: unknown): string {
  if (data === null || data === undefined) return 'Sin detalle';
  if (typeof data === 'string') return data;
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

// Interceptor para responses (manejo centralizado de errores)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // El servidor respondió con un código de error
      console.error(
        `Error del servidor (${error.response.status}): ${formatResponseData(error.response.data)}`
      );

      // Manejar token expirado o inválido
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } else if (error.request) {
      // La petición fue hecha pero no hubo respuesta
      console.error(`Error de red: ${error.message || 'Sin respuesta del servidor'}`);
    } else {
      // Algo pasó al configurar la petición
      console.error(`Error: ${error.message || 'Error desconocido'}`);
    }

    return Promise.reject(error);
  }
);

export default api;
