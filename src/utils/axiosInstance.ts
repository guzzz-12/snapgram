import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL
});

/** Interceptor para agregar el token de autenticación a las consultas */
export const setupAxiosInterceptors = (getToken: () => Promise<string | null>) => {
  axiosInstance.interceptors.request.use(async (config) => {
    const token = await getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });
};
