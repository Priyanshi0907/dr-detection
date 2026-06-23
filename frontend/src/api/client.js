import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 60000,
});

// Attach JWT token to every request
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 (unauthorized) globally
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('logout'));
    }
    return Promise.reject(error);
  }
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extracts a human-readable error message from an Axios error.
 * Surfaces the real `detail` message returned by FastAPI instead of
 * falling back to a generic string.
 *
 * Priority:
 *  1. error.response.data.detail  (FastAPI validation / HTTPException)
 *  2. error.response.data.message (other structured errors)
 *  3. error.message               (network / timeout)
 *  4. fallback string
 */
export function extractErrorMessage(error, fallback = 'An unexpected error occurred. Please try again.') {
  if (!error) return fallback;

  const data = error.response?.data;
  if (data) {
    // FastAPI returns detail as a string or as an array of validation objects
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.detail) && data.detail.length > 0) {
      // Pydantic validation errors — join field messages
      return data.detail.map((d) => d.msg || JSON.stringify(d)).join('; ');
    }
    if (typeof data.message === 'string') return data.message;
  }

  if (error.message) return error.message;
  return fallback;
}

// ─── Auth Endpoints ───────────────────────────────────────────────────────────

export const authAPI = {
  register: (data) => API.post('/api/auth/register', data),

  login: (email, password) => {
    const form = new FormData();
    form.append('username', email);
    form.append('password', password);
    return API.post('/api/auth/login', form);
  },

  forgotPassword: (email) => API.post('/api/auth/forgot-password', { email }),

  resetPassword: (data) => API.post('/api/auth/reset-password', data),

  getProfile: () => API.get('/api/profile'),

  deleteAccount: () => API.delete('/api/profile'),
};

// ─── Prediction Endpoints ─────────────────────────────────────────────────────

export const predictionAPI = {
  /**
   * Submits a retinal image for DR analysis.
   *
   * Optional profile extras (phone, age, gender) are read from localStorage
   * so the backend can embed them in the generated PDF report.
   *
   * On failure, the real server message (e.g. "Please enter a valid retinal
   * fundus image") is preserved on the error object as `error.userMessage`
   * so consuming components can display it directly without guessing.
   */
  predict: async (formData) => {
    // Attach optional profile fields from localStorage
    try {
      const userRaw = localStorage.getItem('user');
      if (userRaw) {
        const user = JSON.parse(userRaw);
        if (user?.email) {
          const raw = localStorage.getItem(`profile_extra_${user.email}`);
          if (raw) {
            const extra = JSON.parse(raw);
            if (extra.phone) formData.append('phone', extra.phone);
            if (extra.age) formData.append('age', extra.age);
            if (extra.gender) formData.append('gender', extra.gender);
          }
        }
      }
    } catch (_) {
      // Silently ignore malformed profile data
    }

    try {
      return await API.post('/api/predict', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000, // 5 minutes for large images + model inference
      });
    } catch (error) {
      // Attach a clean user-facing message to the error so callers don't
      // need to re-parse the response themselves.
      error.userMessage = extractErrorMessage(
        error,
        'Analysis failed. Please try again or use a different image.'
      );
      throw error;
    }
  },

  getHistory: () => API.get('/api/history'),

  deleteRecord: (id) => API.delete(`/api/history/${id}`),

  getReport: (id) =>
    API.get(`/api/report/${id}`, { responseType: 'blob' }),

  getStats: () => API.get('/api/stats'),
};

export default API;