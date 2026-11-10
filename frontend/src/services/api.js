import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Interceptori i Kërkesave: Bashkëngjit Sanctum Bearer Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('tastio_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptori i Përgjigjeve: Trajtim i unifikuar i gabimeve dhe 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('tastio_token');
      localStorage.removeItem('tastio_user');
      window.dispatchEvent(new Event('tastio:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
