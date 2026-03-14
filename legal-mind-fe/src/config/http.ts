import axios from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { refreshBackendSession } from '@/services/auth';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

const http = axios.create({
  baseURL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

let refreshPromise: Promise<string | null> | null = null;

const notifyUnauthorized = () => {
  toast.error('Unauthorized access. Please sign in again.', {
    id: 'unauthorized-access',
  });
};

const notifyTimeout = () => {
  toast.error('Network timeout. Please try again.', {
    id: 'network-timeout',
  });
};

const notifyNetworkError = () => {
  toast.error('Network request failed. Check your connection and retry.', {
    id: 'network-error',
  });
};

const refreshAccessToken = async () => {
  const refreshToken = useAuthStore.getState().refreshToken;

  if (!refreshToken) {
    useAuthStore.getState().clearSession();
    notifyUnauthorized();
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = refreshBackendSession(refreshToken)
      .then((session) => {
        useAuthStore.getState().setAuthenticated(session);
        return session.accessToken;
      })
      .catch(() => {
        useAuthStore.getState().clearSession();
        notifyUnauthorized();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

http.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.code === 'ECONNABORTED') {
      notifyTimeout();
      throw error;
    }

    if (!error.response) {
      notifyNetworkError();
      throw error;
    }

    const originalRequest = error.config as typeof error.config & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && (!originalRequest || originalRequest.url?.includes('/auth/'))) {
      notifyUnauthorized();
      throw error;
    }

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/')
    ) {
      throw error;
    }

    originalRequest._retry = true;
    const nextAccessToken = await refreshAccessToken();

    if (!nextAccessToken) {
      notifyUnauthorized();
      throw error;
    }

    originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
    return http.request(originalRequest);
  },
);

export default http;
