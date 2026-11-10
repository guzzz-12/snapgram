import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL
});

/**
 * Registra el interceptor de solicitudes de token de autenticación y devuelve la función de limpieza.
 */
export const setupAxiosInterceptors = (getToken: () => Promise<string | null>) => {
  const interceptorId = axiosInstance.interceptors.request.use(async (config) => {
    const token = await getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });

  return () => {
    axiosInstance.interceptors.request.eject(interceptorId);
  };
};
