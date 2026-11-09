const DEVICE_STORAGE_KEY = "fk_device_id";
const DEVICE_COOKIE_NAME = "fk_device_id";

let cachedFingerprint = null;

function readCookie(name) {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function writeCookie(name, value) {
  if (typeof document === "undefined" || !value) return;
  try {
    const maxAge = 60 * 60 * 24 * 365 * 10; // 10 tahun
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {}
}

function readStorage(key) {
  if (typeof localStorage === "undefined") return "";
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function writeStorage(key, value) {
  if (typeof localStorage === "undefined" || !value) return;
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function randomDeviceToken() {
  try {
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const bytes = new Uint8Array(6);
      crypto.getRandomValues(bytes);
      return "DEV-" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    }
  } catch {}
  return "DEV-" + (Date.now().toString(16) + Math.random().toString(16).slice(2, 8)).slice(0, 12).toUpperCase();
}

function fnv1aHash(str) {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= c + (i & 255);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return (h1 >>> 0).toString(16).padStart(8, "0").toUpperCase() + (h2 >>> 0).toString(16).padStart(8, "0").toUpperCase();
}

/**
 * Mengambil IMEI / Device ID dari bridge WebView Android/iOS jika tersedia.
 */
function readNativeBridgeDeviceId() {
  if (typeof window === "undefined") return "";

  try {
    const nativeVal =
      window.Android?.getImei?.() ||
      window.Android?.getDeviceId?.() ||
      window.AndroidInterface?.getImei?.() ||
      window.AndroidInterface?.getDeviceId?.() ||
      window.NativeApp?.getImei?.() ||
      window.NativeApp?.getDeviceId?.() ||
      window.__FASTKREDIT_IMEI__ ||
      window.__FASTKREDIT_DEVICE_ID__ ||
      "";
    if (nativeVal && typeof nativeVal === "string" && nativeVal.trim()) {
      const cleaned = nativeVal.trim().slice(0, 100);
      return /^\d+$/.test(cleaned) ? `IMEI-${cleaned}` : cleaned;
    }
  } catch {}

  try {
    const params = new URLSearchParams(window.location.search);
    const paramVal = params.get("imei") || params.get("device_id");
    if (paramVal && paramVal.trim()) {
      const cleaned = paramVal.trim().slice(0, 100);
      return /^\d+$/.test(cleaned) ? `IMEI-${cleaned}` : cleaned;
    }
  } catch {}

  return "";
}

/**
 * Mengembalikan ID perangkat / IMEI unik & persisten pada browser/WebView ini.
 */
export function getDeviceId() {
  if (typeof window === "undefined") return "";

  const nativeId = readNativeBridgeDeviceId();
  if (nativeId) {
    writeStorage(DEVICE_STORAGE_KEY, nativeId);
    writeCookie(DEVICE_COOKIE_NAME, nativeId);
    return nativeId;
  }

  let stored = readStorage(DEVICE_STORAGE_KEY) || readCookie(DEVICE_COOKIE_NAME);
  if (!stored) {
    stored = randomDeviceToken();
  }

  writeStorage(DEVICE_STORAGE_KEY, stored);
  writeCookie(DEVICE_COOKIE_NAME, stored);
  return stored;
}

/**
 * Menghasilkan fingerprint perangkat deterministik (GPU/Screen/Canvas/Timezone)
 * sebagai proteksi tambahan apabila pengguna mencoba membuka mode samaran atau hapus data browser.
 */
export function getDeviceFingerprint() {
  if (cachedFingerprint) return cachedFingerprint;
  if (typeof window === "undefined") return "";

  const parts = [];
  try {
    const nav = window.navigator || {};
    const scr = window.screen || {};
    parts.push(
      nav.platform || "",
      String(nav.hardwareConcurrency || ""),
      String(nav.deviceMemory || ""),
      String(nav.maxTouchPoints || ""),
      `${scr.width || 0}x${scr.height || 0}x${scr.colorDepth || 0}`,
      String(window.devicePixelRatio || 1),
      nav.language || "",
      Intl.DateTimeFormat().resolvedOptions().timeZone || ""
    );

    const canvas = document.createElement("canvas");
    canvas.width = 220;
    canvas.height = 40;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px sans-serif";
      ctx.fillStyle = "#5b21b6";
      ctx.fillRect(10, 4, 90, 22);
      ctx.fillStyle = "#0f172a";
      ctx.fillText("Fastkredit-FP-2026", 4, 8);
      parts.push(canvas.toDataURL().slice(-64));
    }

    const glCanvas = document.createElement("canvas");
    const gl = glCanvas.getContext("webgl") || glCanvas.getContext("experimental-webgl");
    if (gl) {
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      if (dbg) {
        parts.push(
          String(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) || ""),
          String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "")
        );
      }
    }
  } catch {}

  cachedFingerprint = "FP-" + fnv1aHash(parts.join("|"));
  return cachedFingerprint;
}

