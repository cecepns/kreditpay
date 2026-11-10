import { api, TOKEN_KEY } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { get, post } from "@/utils/request";
import { isAppStandalone, isIosBrowser } from "@/utils/pwa";

export function isPushSupported() {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function getNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function uint8ArrayToUrlBase64(buffer) {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function getSwRegistration(timeoutMs = 4000) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    if (!regs || regs.length === 0) return null;
    const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((resolve) => setTimeout(() => resolve(regs[0] || null), timeoutMs)),
    ]);
    return reg || null;
  } catch {
    return null;
  }
}

export async function getCurrentSubscription() {
  if (!isPushSupported()) return null;
  const reg = await getSwRegistration();
  if (!reg?.pushManager) return null;
  try {
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function getPushStatus() {
  const iosNeedsInstall = isIosBrowser() && !isAppStandalone();
  const supported = isPushSupported();
  const permission = getNotificationPermission();
  const sub = supported ? await getCurrentSubscription() : null;

  let isRegisteredServer = false;
  let totalDevices = 0;

  if (localStorage.getItem(TOKEN_KEY)) {
    try {
      const res = await get(API_ENDPOINTS.PUSH.STATUS, sub?.endpoint ? { endpoint: sub.endpoint } : undefined);
      isRegisteredServer = Boolean(res?.data?.currentRegistered);
      totalDevices = Number(res?.data?.totalDevices || 0);
    } catch {
      // Abaikan jika gagal mengambil status server
    }
  }

  return {
    supported,
    iosNeedsInstall,
    permission,
    isSubscribedLocal: Boolean(sub),
    isRegisteredServer,
    active: supported && permission === "granted" && Boolean(sub) && isRegisteredServer,
    totalDevices,
    endpoint: sub?.endpoint || null,
  };
}

async function ensureMatchingSubscription(reg, vapidPublicKey) {
  let sub = await reg.pushManager.getSubscription();
  if (sub && sub.options?.applicationServerKey) {
    const currentKey = uint8ArrayToUrlBase64(sub.options.applicationServerKey);
    if (currentKey && currentKey !== vapidPublicKey) {
      await sub.unsubscribe().catch(() => {});
      sub = null;
    }
  }
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }
  return sub;
}

export async function subscribeUserPush() {
  if (isIosBrowser() && !isAppStandalone()) {
    throw new Error(
      "Untuk iPhone/iPad, instal aplikasi ke Layar Utama (Share → Add to Home Screen) terlebih dahulu untuk mengaktifkan notifikasi push."
    );
  }
  if (!isPushSupported()) {
    throw new Error("Browser atau perangkat ini belum mendukung Native Web Push Notification.");
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    throw new Error(
      "Izin notifikasi ditolak di browser. Silakan izinkan notifikasi pada pengaturan situs browser Anda."
    );
  }

  const reg = await getSwRegistration();
  if (!reg?.pushManager) {
    throw new Error("Service Worker belum aktif. Pastikan halaman diakses melalui HTTPS lalu muat ulang.");
  }

  const keyRes = await get(API_ENDPOINTS.PUSH.VAPID_PUBLIC_KEY);
  const publicKey = keyRes?.data?.publicKey;
  if (!publicKey) {
    throw new Error("Kunci VAPID server belum tersedia.");
  }

  const sub = await ensureMatchingSubscription(reg, publicKey);
  const subJson = sub.toJSON();
  const saveRes = await post(API_ENDPOINTS.PUSH.SUBSCRIBE, subJson);

  window.dispatchEvent(new Event("push-subscription-changed"));
  return { subscribed: true, message: saveRes?.message, subscription: subJson };
}

export async function unsubscribeUserPush() {
  const sub = await getCurrentSubscription();
  if (sub) {
    await post(API_ENDPOINTS.PUSH.UNSUBSCRIBE, { endpoint: sub.endpoint }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
  window.dispatchEvent(new Event("push-subscription-changed"));
  return { subscribed: false };
}

export async function syncExistingPushSubscription() {
  try {
    if (!localStorage.getItem(TOKEN_KEY)) return false;
    if (!isPushSupported() || Notification.permission !== "granted") return false;
    const reg = await getSwRegistration();
    if (!reg?.pushManager) return false;

    const keyRes = await get(API_ENDPOINTS.PUSH.VAPID_PUBLIC_KEY);
    const publicKey = keyRes?.data?.publicKey;
    if (!publicKey) return false;

    const sub = await ensureMatchingSubscription(reg, publicKey);
    if (!sub) return false;

    await post(API_ENDPOINTS.PUSH.SUBSCRIBE, sub.toJSON());
    window.dispatchEvent(new Event("push-subscription-changed"));
    return true;
  } catch {
    return false;
  }
}

export async function unsubscribeDeviceWithToken(token) {
  if (!token) return;
  try {
    const sub = await getCurrentSubscription();
    if (!sub?.endpoint) return;
    await api.post(
      API_ENDPOINTS.PUSH.UNSUBSCRIBE,
      { endpoint: sub.endpoint },
      { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 }
    );
  } catch {
    // Abaikan error saat logout
  }
}

export async function sendTestPush() {
  const sub = await getCurrentSubscription();
  if (!sub) {
    throw new Error("Aktifkan push notification di perangkat ini terlebih dahulu.");
  }
  return post(API_ENDPOINTS.PUSH.TEST, { endpoint: sub.endpoint });
}

