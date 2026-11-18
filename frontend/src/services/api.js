import axios from 'axios';

const getApiBaseUrl = () => {
  const envUrl = import.meta.env?.VITE_API_BASE_URL;
  if (envUrl) {
    // Nëse faqja po hapet nga një pajisje celulare (p.sh. 192.168.x.x) dhe env përmban localhost:
    if (typeof window !== 'undefined' && window.location && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      try {
        const u = new URL(envUrl);
        if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
          u.hostname = window.location.hostname;
          return u.toString().replace(/\/$/, '');
        }
      } catch {}
    }
    return envUrl;
  }
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${host}:8000/api/v1`;
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
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
