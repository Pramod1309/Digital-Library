import axios from 'axios';
import config from '../config';

const BACKEND_URL = config.apiBaseUrl;
const API = `${BACKEND_URL}/api`;

// Create axios instance
const api = axios.create({
  baseURL: API,
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;

    if (isFormData) {
      if (typeof config.headers?.setContentType === 'function') {
        config.headers.setContentType(undefined);
      } else if (config.headers) {
        delete config.headers['Content-Type'];
      }
    } else if (config.headers && !config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }

    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;
