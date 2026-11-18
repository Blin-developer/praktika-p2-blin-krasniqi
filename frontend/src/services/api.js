import axios from 'axios';

const getApiBaseUrl = () => {
  // Në mjedis shfletuesi (si në PC ashtu edhe në telefon nëpërmjet Wi-Fi/LAN):
  if (typeof window !== 'undefined' && window.location) {
    // Kur shfletohet përmes Vite dev server (porta 5173), përdorim Vite proxy (/api/v1)
    // Kjo garanton që telefoni në LAN (p.sh. 192.168.0.163:5173) mund të komunikojë
    // me backend-in 127.0.0.1:8000 pa pasur nevojë të ndryshohen portat ose rregullat e Windows Firewall.
    if (window.location.port === '5173') {
      return `${window.location.origin}/api/v1`;
    }

    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return `${window.location.origin}/api/v1`;
    }
  }

  const envUrl = import.meta.env?.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl;
  }
  return 'http://localhost:8000/api/v1';
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
