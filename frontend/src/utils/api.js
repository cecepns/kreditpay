import axios from "axios";
import { API_ENDPOINTS, API_BASE_URL } from "@/utils/endpoints";
import { getDeviceFingerprint, getDeviceId } from "@/utils/device";

export const TOKEN_KEY = "kreditpay_token";
export const BLOCK_NOTICE_KEY = "fk_block_notice";
export const BLOCKED_DEVICE_MESSAGE = "Device tidak mendukung";

export const normalizeBlockedMessage = (msg) => {
  if (!msg || /blokir/i.test(String(msg))) return BLOCKED_DEVICE_MESSAGE;
  return msg;
};

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
      ["ACCOUNT_BLOCKED", "DEVICE_BLOCKED"].includes(error.response?.data?.code);

    if (isBlocked && error.response?.data) {
      error.response.data.message = normalizeBlockedMessage(error.response.data.message);
    }

    if ((error.response?.status === 401 || isBlocked) && !isAuthRoute) {
      localStorage.removeItem(TOKEN_KEY);
      if (isBlocked) {
        try {
          sessionStorage.setItem(BLOCK_NOTICE_KEY, BLOCKED_DEVICE_MESSAGE);
        } catch {}
      }
      if (window.location.pathname !== "/login") window.location.assign("/login");
    }
    return Promise.reject(error);
  }
);
