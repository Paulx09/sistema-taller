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

// Interceptor para requests (agregar token JWT en el futuro)
api.interceptors.request.use(
  (config) => {
    // TODO: Agregar token de autenticación cuando se implemente
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para responses (manejo centralizado de errores)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // El servidor respondió con un código de error
      console.error('Error del servidor:', error.response.data);
      
      // TODO: Manejar errores específicos (401 logout, 403 forbidden, etc.)
      // if (error.response.status === 401) {
      //   localStorage.removeItem('token');
      //   window.location.href = '/login';
      // }
    } else if (error.request) {
      // La petición fue hecha pero no hubo respuesta
      console.error('Error de red:', error.request);
    } else {
      // Algo pasó al configurar la petición
      console.error('Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api;
