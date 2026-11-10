import { registerSW } from "virtual:pwa-register";

let swInitialized = false;

export function initPwa() {
  if (typeof window === "undefined") return;

  if (!window.__pwaListenersBound) {
    window.__pwaListenersBound = true;

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      window.__pwaInstallPrompt = e;
      window.dispatchEvent(new Event("pwa-prompt-available"));
    });

    window.addEventListener("appinstalled", () => {
      window.__pwaInstallPrompt = null;
      window.__pwaInstalled = true;
      window.dispatchEvent(new Event("pwa-installed"));
    });
  }

  if (!swInitialized && "serviceWorker" in navigator) {
    swInitialized = true;
    try {
      registerSW({
        immediate: true,
        onRegisteredSW(_swUrl, registration) {
          if (registration && typeof registration.update === "function") {
            registration.update().catch(() => {});
          }
        },
      });
    } catch {
      // Abaikan jika browser/webview menonaktifkan service worker
    }
  }
}

export function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  return (
    Boolean(window.matchMedia?.("(display-mode: standalone)")?.matches) ||
    window.navigator?.standalone === true
  );
}

export function isAppStandalone() {
  if (typeof window === "undefined") return false;
  return Boolean(window.__pwaInstalled) || isStandaloneDisplay();
}

export function isIosBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isAppleTouch = /iPhone|iPad|iPod/i.test(ua);
  const isIpadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isAppleTouch || isIpadOs;
}

export function isAndroidDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent || "");
}

export function isInAppBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|FB_IAB|Instagram|Line\/|BytedanceWebview|ByteLocale|TikTok|Musical_ly|MicroMessenger|Telegram|Snapchat|Twitter|LinkedInApp|GSA\/|; wv\)/i.test(
    ua
  );
}

export function supportsBeforeInstallPrompt() {
  if (typeof window === "undefined") return false;
  return "onbeforeinstallprompt" in window && !isIosBrowser() && !isInAppBrowser();
}

export function getDeferredPrompt() {
  if (typeof window === "undefined") return null;
  return window.__pwaInstallPrompt || null;
}

export function clearDeferredPrompt() {
  if (typeof window === "undefined") return;
  window.__pwaInstallPrompt = null;
  window.dispatchEvent(new Event("pwa-prompt-cleared"));
}

export async function checkIsRelatedAppInstalled() {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.getInstalledRelatedApps === "function") {
      const apps = await navigator.getInstalledRelatedApps();
      return Array.isArray(apps) && apps.length > 0;
    }
  } catch {
    // Abaikan error permissions / browser unsupported
  }
  return false;
}

export function waitForInstallPrompt(timeoutMs = 3500) {
  const existing = getDeferredPrompt();
  if (existing) return Promise.resolve(existing);

  if (!supportsBeforeInstallPrompt()) return Promise.resolve(null);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (promptEvent) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("pwa-prompt-available", onReady);
      clearTimeout(timer);
      resolve(promptEvent || null);
    };

    const onReady = () => finish(getDeferredPrompt());
    const timer = setTimeout(() => finish(getDeferredPrompt()), timeoutMs);

    window.addEventListener("pwa-prompt-available", onReady, { once: true });

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then(() => {
          const readyPrompt = getDeferredPrompt();
          if (readyPrompt) finish(readyPrompt);
        })
        .catch(() => {});
    }
  });
}

export function getAndroidChromeIntentUrl() {
  if (typeof window === "undefined") return "";
  const url = window.location.href;
  const stripped = url.replace(/^https?:\/\//i, "");
  const scheme = window.location.protocol.replace(":", "") || "https";
  return `intent://${stripped}#Intent;scheme=${scheme};package=com.android.chrome;end`;
}
