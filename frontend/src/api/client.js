import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60s for AI operations
});

// Request interceptor: attach JWT Bearer token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAuthPath = window.location.pathname === '/resume' || window.location.pathname === '/';
      if (!isAuthPath) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/resume';
      }
    }
    return Promise.reject(error);
  }
);

// Auth Endpoints
export const authApi = {
  uploadResume: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/auth/resume', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 2 min max for resume parsing
    });
    return response.data;
  },

  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};

// Companies Endpoints
export const companiesApi = {
  getCompanies: async () => {
    const response = await apiClient.get('/companies');
    return response.data;
  },

  createCompany: async (url, name) => {
    const payload = { url: url.trim() };
    if (name && name.trim()) {
      payload.name = name.trim();
    }
    const response = await apiClient.post('/companies', payload, {
      timeout: 90000, // 90s for scrape + AI analysis
    });
    return response.data;
  },

  getCompany: async (id) => {
    const response = await apiClient.get(`/companies/${id}`);
    return response.data;
  },
};

// Interviews Endpoints
export const interviewsApi = {
  createInterview: async (companyId) => {
    const response = await apiClient.post('/interviews', { company_id: companyId });
    return response.data;
  },

  sendTurn: async (interviewId, answer) => {
    const response = await apiClient.post(`/interviews/${interviewId}/turn`, { answer });
    return response.data;
  },

  getInterview: async (interviewId) => {
    const response = await apiClient.get(`/interviews/${interviewId}`);
    return response.data;
  },
};

export default apiClient;
