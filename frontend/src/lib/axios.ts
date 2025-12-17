import { useAuthStore } from "@/stores/useAuthStore";
import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.MODE === "development"
      ? "http://localhost:5001/api"
      : "/api",
  withCredentials: true,
});

// gắn access token vào request header
api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();

  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;

  return config;
});

// tự động gọi refresh api khi access token hết hạn
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    // những api không cần check
    if (
      originalRequest.url.includes("/auth/signin") ||
      originalRequest.url.includes("/auth/signup") ||
      originalRequest.url.includes("/auth/refresh") ||
      originalRequest.url.includes("/auth/refresh-when-unauthorized")
    )
      return Promise.reject(error);

    originalRequest._retryCount = originalRequest._retryCount || 0;

    if (error.response?.status === 403 && originalRequest._retryCount < 4) {
      originalRequest._retryCount++;

      try {
        //const res = await api.post("/auth/refresh", { withCredentials: true });

        const res = await api.post("/auth/refresh-when-unauthorized", {
          withCredentials: true,
        });

        const newAccessToken = res.data.accessToken;

        useAuthStore.getState().setAccessToken(newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        return api(originalRequest);
      } catch (error) {
        useAuthStore.getState().clearState();

        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
