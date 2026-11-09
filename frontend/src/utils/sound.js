import notifSound from "@/assets/message-notif.mp3";

let audioContextUnlocked = false;
let globalAudio = null;
let lastPlayedAt = 0;

function getAudio() {
  if (!globalAudio) {
    globalAudio = new Audio(notifSound);
    globalAudio.preload = "auto";
  }
  return globalAudio;
}

// Buka kunci (unlock) audio context saat pertama kali pengguna/admin melakukan interaksi klik/tap/tombol
if (typeof window !== "undefined") {
  const unlockAudio = () => {
    if (audioContextUnlocked) return;
    try {
      const a = getAudio();
      a.muted = true;
      const p = a.play();
      if (p !== undefined) {
        p.then(() => {
          a.pause();
          a.currentTime = 0;
          a.muted = false;
          audioContextUnlocked = true;
          window.removeEventListener("click", unlockAudio);
          window.removeEventListener("touchstart", unlockAudio);
          window.removeEventListener("keydown", unlockAudio);
        }).catch(() => {});
      }
    } catch {}
  };

  window.addEventListener("click", unlockAudio, { passive: true });
  window.addEventListener("touchstart", unlockAudio, { passive: true });
  window.addEventListener("keydown", unlockAudio);
}

/**
 * Memutar suara notifikasi chat (message-notif.mp3).
 * Dilengkapi throttle 1.5 detik agar suara tidak berulang tumpang tindih,
 * serta memanfaatkan elemen audio yang telah di-unlock agar bekerja mulus di mobile & WebView.
 */
export function playChatNotificationSound() {
  const now = Date.now();
  if (now - lastPlayedAt < 1500) return;
  lastPlayedAt = now;

  try {
    const audio = getAudio();
    audio.muted = false;
    audio.volume = 1.0;
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.debug("Autoplay suara notifikasi dibatasi browser sebelum interaksi:", err);
      });
    }
  } catch (err) {
    console.debug("Gagal memutar suara notifikasi chat:", err);
  }
}

