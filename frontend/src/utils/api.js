import axios from "axios";
import { API_ENDPOINTS, API_BASE_URL } from "@/utils/endpoints";
import { getDeviceFingerprint, getDeviceId } from "@/utils/device";

export const TOKEN_KEY = "kreditpay_token";
export const BLOCK_NOTICE_KEY = "fk_block_notice";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const deviceId = getDeviceId();
  const deviceFp = getDeviceFingerprint();
  if (deviceId) config.headers["x-device-id"] = deviceId;
  if (deviceFp) config.headers["x-device-fp"] = deviceFp;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const isAuthRoute =
      error.config?.url === API_ENDPOINTS.AUTH.LOGIN ||
      error.config?.url === API_ENDPOINTS.AUTH.REGISTER ||
      error.config?.url === API_ENDPOINTS.AUTH.CHECK_RESET_EMAIL ||
      error.config?.url === API_ENDPOINTS.AUTH.RESET_PASSWORD;
    const isBlocked =
      error.response?.status === 403 &&
      error.response?.data?.code === "ACCOUNT_BLOCKED";

    if ((error.response?.status === 401 || isBlocked) && !isAuthRoute) {
      localStorage.removeItem(TOKEN_KEY);
      if (isBlocked && error.response?.data?.message) {
        try {
          sessionStorage.setItem(BLOCK_NOTICE_KEY, error.response.data.message);
        } catch {}
      }
      if (window.location.pathname !== "/login") window.location.assign("/login");
    }
    return Promise.reject(error);
  }
);
