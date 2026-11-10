import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  checkIsRelatedAppInstalled,
  clearDeferredPrompt,
  getDeferredPrompt,
  initPwa,
  isAppStandalone,
  isInAppBrowser,
  isIosBrowser,
  supportsBeforeInstallPrompt,
  waitForInstallPrompt,
} from "@/utils/pwa";

let lastInstalledToastAt = 0;

export default function usePwaInstall() {
  const [hasPrompt, setHasPrompt] = useState(() => Boolean(getDeferredPrompt()));
  const [isStandalone, setIsStandalone] = useState(() => isAppStandalone());
  const [installing, setInstalling] = useState(false);
  const [guideMode, setGuideMode] = useState(null); // null | "ios" | "inapp" | "browser"

  useEffect(() => {
    initPwa();

    const syncPrompt = () => {
      setHasPrompt(Boolean(getDeferredPrompt()));
      setIsStandalone(isAppStandalone());
    };

    const onInstalled = () => {
      clearDeferredPrompt();
      setHasPrompt(false);
      setIsStandalone(true);
      setGuideMode(null);
      const now = Date.now();
      if (now - lastInstalledToastAt > 1500) {
        lastInstalledToastAt = now;
        toast.success("Fastkredit berhasil diinstall!");
      }
    };

    syncPrompt();
    window.addEventListener("pwa-prompt-available", syncPrompt);
    window.addEventListener("pwa-prompt-cleared", syncPrompt);
    window.addEventListener("pwa-installed", onInstalled);

    const standaloneMql = window.matchMedia?.("(display-mode: standalone)");
    standaloneMql?.addEventListener?.("change", syncPrompt);

    checkIsRelatedAppInstalled().then((installed) => {
      if (installed) setIsStandalone(true);
    });

    return () => {
      window.removeEventListener("pwa-prompt-available", syncPrompt);
      window.removeEventListener("pwa-prompt-cleared", syncPrompt);
      window.removeEventListener("pwa-installed", onInstalled);
      standaloneMql?.removeEventListener?.("change", syncPrompt);
    };
  }, []);

  const showContextualGuide = () => {
    if (isIosBrowser()) {
      setGuideMode("ios");
    } else if (isInAppBrowser()) {
      setGuideMode("inapp");
    } else {
      setGuideMode("browser");
    }
  };

  const triggerPrompt = async (promptEvent) => {
    try {
      await promptEvent.prompt();
      clearDeferredPrompt();
      setHasPrompt(false);

      const choice = await promptEvent.userChoice;
      if (choice?.outcome === "accepted") {
        toast.success("Memulai instalasi Fastkredit...");
      } else {
        toast("Instalasi dibatalkan. Klik Install lagi jika ingin memasang aplikasi.", { icon: "ℹ️" });
      }
      return true;
    } catch (err) {
      if (err?.name === "NotAllowedError") {
        window.__pwaInstallPrompt = promptEvent;
        setHasPrompt(true);
        toast("Popup install siap! Ketuk tombol Install Aplikasi sekali lagi.", { icon: "📲" });
        return true;
      }
      console.error("Install prompt error:", err);
      clearDeferredPrompt();
      setHasPrompt(false);
      return false;
    }
  };

  const handleInstallClick = async () => {
    if (installing) return;

    const immediatePrompt = getDeferredPrompt();
    if (immediatePrompt) {
      const triggered = await triggerPrompt(immediatePrompt);
      if (triggered) return;
    }

    if (supportsBeforeInstallPrompt()) {
      setInstalling(true);
      let waitedPrompt = null;
      try {
        waitedPrompt = await waitForInstallPrompt(3500);
      } finally {
        setInstalling(false);
      }

      if (waitedPrompt) {
        const triggered = await triggerPrompt(waitedPrompt);
        if (triggered) return;
      }

      if (await checkIsRelatedAppInstalled()) {
        setIsStandalone(true);
        toast.success("Fastkredit sudah terpasang di perangkat Anda!");
        return;
      }
    }

    showContextualGuide();
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link halaman disalin! Tempel di Google Chrome / Safari.");
    } catch {
      toast.error("Salin alamat URL di atas lalu buka di Chrome.");
    }
  };

  return {
    hasPrompt,
    isStandalone,
    installing,
    guideMode,
    setGuideMode,
    handleInstallClick,
    handleCopyUrl,
  };
}
