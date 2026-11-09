import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { TOKEN_KEY } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { get, post } from "@/utils/request";
import { getDeviceFingerprint, getDeviceId } from "@/utils/device";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => !!localStorage.getItem(TOKEN_KEY));

  const refresh = useCallback(async () => {
    const res = await get(API_ENDPOINTS.AUTH.PROFILE);
    setUser(res.data);
    return res.data;
  }, []);

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    refresh()
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, [refresh]);

  const authenticate = useCallback(async (url, payload) => {
    const device_id = getDeviceId();
    const device_fingerprint = getDeviceFingerprint();
    const res = await post(url, { ...payload, device_id, device_fingerprint });
    localStorage.setItem(TOKEN_KEY, res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const value = useMemo(
    () => ({
      user, loading, refresh, setUser,
      login: (identifier, password) => authenticate(API_ENDPOINTS.AUTH.LOGIN, { identifier, password, pin: password }),
      register: (payload) => authenticate(API_ENDPOINTS.AUTH.REGISTER, { ...payload, pin: payload.password || payload.pin, password: payload.password || payload.pin }),
      logout: () => { localStorage.removeItem(TOKEN_KEY); setUser(null); },
    }),
    [user, loading, refresh, authenticate]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
