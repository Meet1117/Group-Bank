import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("gb_token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const msg = error?.response?.data?.message || "";
    // Log out on unauthorized, or when the account has been blocked (403).
    if (status === 401 || (status === 403 && /blocked/i.test(msg))) {
      localStorage.removeItem("gb_token");
      localStorage.removeItem("gb_user");
      if (
        typeof window !== "undefined" &&
        window.location &&
        window.location.pathname !== "/login"
      ) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
