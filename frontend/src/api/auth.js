import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export async function login(email, password) {
  const res = await api.post("/auth/login", { email, password });
  return res.data;
}

export async function register(email, password, role = "user", accessKey = "") {
  const res = await api.post("/auth/register", { email, password, role, access_key: accessKey });
  return res.data;
}

export async function me() {
  const res = await api.get("/auth/me");
  return res.data;
}

export default api;
