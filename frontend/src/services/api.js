import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request Interceptor: Attach Sanctum Bearer Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('gourmet_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Uniform error handling & 401 redirection
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('gourmet_token');
      localStorage.removeItem('gourmet_user');
      // If we are not already on auth page, dispatch an auth event
      window.dispatchEvent(new Event('gourmet:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
