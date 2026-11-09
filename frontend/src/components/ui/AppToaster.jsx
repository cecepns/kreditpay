import { useEffect, useRef } from "react";
import toast, { resolveValue, ToastBar, useToaster } from "react-hot-toast";

const TOAST_OPTIONS = {
  duration: 2500,
  removeDelay: 250,
  style: {
    borderRadius: "14px",
    fontWeight: 600,
    pointerEvents: "auto",
  },
  success: { duration: 2500, removeDelay: 250 },
  error: { duration: 3500, removeDelay: 250 },
  loading: { duration: Infinity, removeDelay: 250 },
  blank: { duration: 2500, removeDelay: 250 },
};

function ToastRow({ t, offset, onHeightUpdate, children }) {
  const elRef = useRef(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const update = () => {
      const h = el.getBoundingClientRect().height;
      if (h > 0) onHeightUpdate(t.id, h);
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(el, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [t.id, onHeightUpdate]);

  const pos = t.position || "top-center";
  const isTop = pos.includes("top");

  return (
    <div
      ref={elRef}
      style={{
        left: 0,
        right: 0,
        top: isTop ? 0 : undefined,
        bottom: !isTop ? 0 : undefined,
        display: "flex",
        position: "absolute",
        justifyContent: pos.includes("center")
          ? "center"
          : pos.includes("right")
          ? "flex-end"
          : "flex-start",
        zIndex: t.visible ? 9999 : 9990,
        pointerEvents: "none",
        transition: "all 230ms cubic-bezier(.21,1.02,.73,1)",
        transform: `translateY(${offset * (isTop ? 1 : -1)}px)`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Pengganti Toaster bawaan react-hot-toast tanpa pause-on-hover/touch
 * agar toast tidak pernah macet/menumpuk di browser mobile & WebView.
 */
export default function AppToaster() {
  const { toasts, handlers } = useToaster(TOAST_OPTIONS);

  // Otomatis tutup toast status lama agar tidak bertumpuk saat update data beruntun
  useEffect(() => {
    const activeStatus = toasts
      .filter((t) => t.visible && !t.dismissed && t.type !== "custom")
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    if (activeStatus.length > 1) {
      activeStatus.slice(1).forEach((older) => {
        toast.dismiss(older.id);
      });
    }
  }, [toasts]);

  // Failsafe jika timer sempat tertunda saat aplikasi di-background
  useEffect(() => {
    const cleanupExpired = () => {
      const now = Date.now();
      toasts.forEach((t) => {
        if (
          t.visible &&
          !t.dismissed &&
          t.type !== "custom" &&
          t.type !== "loading" &&
          Number.isFinite(t.duration) &&
          now - (t.createdAt || now) > t.duration + 600
        ) {
          toast.dismiss(t.id);
        }
      });
    };

    const timer = setInterval(cleanupExpired, 1000);
    window.addEventListener("visibilitychange", cleanupExpired);
    return () => {
      clearInterval(timer);
      window.removeEventListener("visibilitychange", cleanupExpired);
    };
  }, [toasts]);

  return (
    <div
      data-app-toaster="true"
      style={{
        position: "fixed",
        zIndex: 9999,
        top: 24,
        left: 16,
        right: 16,
        bottom: 16,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => {
        const position = t.position || "top-center";
        const offset = handlers.calculateOffset(t, {
          reverseOrder: false,
          gutter: 8,
          defaultPosition: "top-center",
        });

        return (
          <ToastRow
            key={t.id}
            t={t}
            offset={offset}
            onHeightUpdate={handlers.updateHeight}
          >
            {t.type === "custom" ? (
              <div style={{ pointerEvents: t.visible ? "auto" : "none" }}>{resolveValue(t.message, t)}</div>
            ) : (
              <div
                onClick={() => toast.dismiss(t.id)}
                style={{ pointerEvents: t.visible ? "auto" : "none" }}
                className="cursor-pointer"
              >
                <ToastBar toast={t} position={position} />
              </div>
            )}
          </ToastRow>
        );
      })}
    </div>
  );
}
