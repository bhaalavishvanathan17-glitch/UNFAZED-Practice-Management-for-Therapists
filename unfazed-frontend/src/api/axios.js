import axios from 'axios';

/**
 * Axios API Instance
 * 
 * Creates a pre-configured Axios instance for all API calls.
 * 
 * Why a custom instance?
 * - Sets the base URL once instead of repeating it in every request
 * - Automatically attaches the auth token to every request
 * - Provides a single place to handle response errors (like expired tokens)
 * 
 * In development: Vite's proxy sends /api requests to localhost:5000
 * In production: VITE_API_URL points to the deployed backend
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor ─────────────────────────────────────────
// Automatically attach the JWT token to every outgoing request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('unfazed_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ────────────────────────────────────────
// Handle common error responses globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the server returns 401, the token is invalid or expired
    if (error.response?.status === 401) {
      localStorage.removeItem('unfazed_token');
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
