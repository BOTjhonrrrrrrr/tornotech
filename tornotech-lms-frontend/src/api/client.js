import axios from "axios";

// El backend Spring Boot corre en :8081 (ver application.properties)
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8081/api",
});

// Adjunta el JWT guardado tras el login (ver context/AuthContext.jsx) a cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("tornotech_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si el backend responde 401 (token vencido/invalido), limpia la sesión y manda a /login.
// No usa el AuthContext directamente (evita dependencia circular); por eso limpia localStorage
// a mano con las mismas claves que usa AuthContext.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes("/auth/login")) {
      localStorage.removeItem("tornotech_token");
      localStorage.removeItem("tornotech_usuario");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
