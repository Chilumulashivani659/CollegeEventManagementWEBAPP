import axios from 'axios';
import { getToken } from '../utils/authStorage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// Attach the coordinator token to every request. Public event requests work
// with or without it; protected requests require it.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getEvents = (search = '') => {
  const params = search ? { search } : {};
  return api.get('/events', { params });
};

export const searchEvents = (query) => api.get('/events/search', { params: { q: query } });
export const getEvent = (id) => api.get(`/events/${id}`);
export const createEvent = (data) => api.post('/events', data);
export const updateEvent = (id, data) => api.put(`/events/${id}`, data);
export const deleteEvent = (id) => api.delete(`/events/${id}`);
export const healthCheck = () => api.get('/health');

export const registerCoordinator = (data) => api.post('/coordinators/register', data);
export const loginCoordinator = (data) => api.post('/coordinators/login', data);
export const getCurrentCoordinator = () => api.get('/coordinators/me');

export default api;
