import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://voter-hub-8.preview.emergentagent.com";
export const API = `${BACKEND_URL.replace(/\/$/, "")}/api`;

const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      const path = window.location.pathname;
      if (path !== "/login") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
      }
    }
    return Promise.reject(err);
  }
);

export default api;
