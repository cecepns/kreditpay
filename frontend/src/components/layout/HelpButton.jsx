import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessagesSquare,
  X,
  Send,
  ImagePlus,
  Loader2,
  Check,
  CheckCheck,
  Headphones,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import useAuth from "@/hooks/useAuth";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { get, upload, post } from "@/utils/request";
import { formatTime, fileUrl } from "@/utils/format";
import { playChatNotificationSound } from "@/utils/sound";

const QUICK_SUGGESTIONS = [
  "Halo Admin, bagaimana cara aktivasi Pinjaman?",
  "Berapa lama proses verifikasi dokumen?",
  "Bagaimana cara menaikkan limit kredit saya?",
  "Saya butuh bantuan kendala transaksi.",
];

export default function HelpButton() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [inputMessage, setInputMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [sending, setSending] = useState(false);

  const fileInputRef = useRef(null);
  const chatBodyRef = useRef(null);
  const messagesEndRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const prevUnreadRef = useRef(null);
  const latestIdRef = useRef(null);
  const seenIdsRef = useRef(new Set());

  // Ambil unread counter saat tertutup & bunyikan notifikasi jika ada pesan baru dari admin
  const fetchUnread = useCallback(async () => {
    if (!user || isOpen) return;
    try {
      const res = await get(API_ENDPOINTS.CHAT.UNREAD);
      const current = Number(res.data?.unread || 0);
      if (prevUnreadRef.current !== null && current > prevUnreadRef.current) {
        playChatNotificationSound();
      }
      prevUnreadRef.current = current;
      setUnreadCount(current);
    } catch {}
  }, [user, isOpen]);

  // Ambil 50 pesan awal saat chat dibuka
  const fetchInitialMessages = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await get(API_ENDPOINTS.CHAT.MESSAGES, { limit: 50 });
      const list = res.data || [];
      seenIdsRef.current = new Set(list.map((m) => m.id));
      latestIdRef.current = list.length > 0 ? list[list.length - 1]?.id : null;
      setMessages(list);
      setHasMore(!!res.hasMore);
      prevUnreadRef.current = 0;
      setUnreadCount(0);
      setTimeout(() => {
        if (chatBodyRef.current) {
          chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
      }, 100);
    } catch (err) {
      console.warn("Gagal mengambil pesan chat:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Infinite scroll memuat 50 pesan sebelumnya (ke atas)
  const loadOlderMessages = async () => {
    if (!hasMore || loadingMore || messages.length === 0) return;
    const oldestId = messages[0]?.id;
    if (!oldestId) return;

    setLoadingMore(true);
    const container = chatBodyRef.current;
    const prevScrollHeight = container ? container.scrollHeight : 0;

    try {
      const res = await get(API_ENDPOINTS.CHAT.MESSAGES, {
        limit: 50,
        beforeId: oldestId,
      });
      const older = res.data || [];
      setHasMore(!!res.hasMore);

      if (older.length > 0) {
        older.forEach((m) => seenIdsRef.current.add(m.id));
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const filtered = older.filter((m) => !existingIds.has(m.id));
          return [...filtered, ...prev];
        });

        // Pertahankan posisi scroll agar tidak melompat
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - prevScrollHeight;
          }
        });
      }
    } catch (err) {
      console.warn("Gagal memuat pesan sebelumnya:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Polling pesan baru secara real-time + notif suara saat admin membalas
  const pollNewMessages = useCallback(async () => {
    if (!user || !isOpen || loading) return;
    const latestId = latestIdRef.current;

    try {
      const res = await get(
        API_ENDPOINTS.CHAT.MESSAGES,
        latestId ? { afterId: latestId } : { limit: 50 }
      );
      const newMessages = res.data || [];
      const freshMessages = newMessages.filter((m) => !seenIdsRef.current.has(m.id));
      if (freshMessages.length > 0) {
        freshMessages.forEach((m) => seenIdsRef.current.add(m.id));
        latestIdRef.current = freshMessages[freshMessages.length - 1]?.id || latestId;

        if (freshMessages.some((m) => m.sender_role === "admin")) {
          playChatNotificationSound();
        }

        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const filtered = freshMessages.filter((m) => !existingIds.has(m.id));
          return filtered.length > 0 ? [...prev, ...filtered] : prev;
        });

        // Auto scroll ke bawah jika user memang sedang berada di bawah
        if (isNearBottomRef.current && chatBodyRef.current) {
          setTimeout(() => {
            if (chatBodyRef.current) {
              chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
            }
          }, 50);
        }
      }
    } catch {}
  }, [user, isOpen, loading]);

  // Polling unread saat tertutup
  useEffect(() => {
    if (!isOpen && user) {
      fetchUnread();
      const interval = setInterval(fetchUnread, 4000);
      return () => clearInterval(interval);
    }
  }, [isOpen, user, fetchUnread]);

  // Load awal pesan saat chat dibuka
  useEffect(() => {
    if (isOpen && user) {
      fetchInitialMessages();
    } else {
      setMessages([]);
      setHasMore(false);
      latestIdRef.current = null;
      seenIdsRef.current = new Set();
    }
  }, [isOpen, user, fetchInitialMessages]);

  // Polling pesan baru setiap 3 detik saat terbuka (walaupun percakapan awal kosong)
  useEffect(() => {
    if (isOpen && user && !loading) {
      const timer = setInterval(pollNewMessages, 3000);
      return () => clearInterval(timer);
    }
  }, [isOpen, user, loading, pollNewMessages]);

  const handleScroll = () => {
    const el = chatBodyRef.current;
    if (!el) return;
    // Cek apakah posisi scroll berada di bagian bawah
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;

    // Trigger infinite scroll saat mendekati bagian atas (scrollTop <= 30px)
    if (el.scrollTop <= 30 && hasMore && !loadingMore && !loading) {
      loadOlderMessages();
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      return toast.error("Ukuran foto maksimal 5 MB");
    }
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setFilePreview(url);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (textToSend = null) => {
    const msg = (typeof textToSend === "string" ? textToSend : inputMessage).trim();
    if (!msg && !selectedFile) return;

    setSending(true);
    try {
      let res;
      if (selectedFile) {
        const form = new FormData();
        form.append("message", msg);
        form.append("attachment", selectedFile);
        res = await upload(API_ENDPOINTS.CHAT.MESSAGES, form);
      } else {
        res = await post(API_ENDPOINTS.CHAT.MESSAGES, { message: msg });
      }

      setInputMessage("");
      handleRemoveFile();
      if (res.data) {
        seenIdsRef.current.add(res.data.id);
        latestIdRef.current = res.data.id;
        setMessages((prev) => (prev.some((m) => m.id === res.data.id) ? prev : [...prev, res.data]));
        setTimeout(() => {
          if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
          }
        }, 50);
      }
    } catch (err) {
      toast.error(err.message || "Gagal mengirim pesan");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* ── Trigger Floating Button ── */}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-30 mx-auto flex max-w-xl justify-end px-4">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label="Buka Live Chat Bantuan"
          className="pointer-events-auto flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 group focus:outline-none"
        >
          <span className="rounded-full bg-white px-3.5 py-1.5 text-xs font-black text-slate-700 shadow-lg ring-1 ring-slate-100 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Chat CS
          </span>
          <span className="relative grid h-14 w-14 place-items-center rounded-full bg-primary-700 text-white shadow-xl shadow-primary-700/40 ring-2 ring-white">
            <MessagesSquare className="h-7 w-7" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-black text-white ring-2 ring-white animate-bounce">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </span>
        </button>
      </div>

      {/* ── Live Chat Window / Bottom Drawer ── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4">
          <div className="flex h-[88dvh] sm:h-[620px] w-full max-w-md flex-col overflow-hidden rounded-t-[2.5rem] sm:rounded-3xl bg-white shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="flex items-center justify-between bg-primary-800 bg-gradient-to-r from-primary-800 via-primary-700 to-primary-900 px-5 py-4 text-white shrink-0 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20 text-white shadow-inner">
                    <Headphones className="h-5 w-5" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-primary-900" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-wide text-white">Customer Support</h3>
                  <p className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Online · Siap Membantu 24/7
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Tutup Live Chat"
                className="grid h-9 w-9 place-items-center rounded-full bg-white/20 hover:bg-white/30 text-white shadow-sm ring-1 ring-white/40 transition active:scale-95 cursor-pointer"
                title="Tutup Chat"
              >
                <X className="h-5 w-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Body Percakapan dengan Infinite Scroll */}
            <div
              ref={chatBodyRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto bg-slate-50 p-4 space-y-3"
            >
              {/* Infinite Scroll Indicator / Button ke atas */}
              {hasMore && (
                <div className="py-1 text-center">
                  {loadingMore ? (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-primary-700 shadow-xs ring-1 ring-primary-100">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Memuat 50 pesan sebelumnya...</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={loadOlderMessages}
                      className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-500 shadow-xs ring-1 ring-slate-200 hover:text-primary-700 hover:ring-primary-300 transition"
                    >
                      ↑ Geser ke atas / klik untuk 50 pesan sebelumnya
                    </button>
                  )}
                </div>
              )}

              {/* Welcome Banner */}
              <div className="rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white p-3.5 text-xs text-slate-700 shadow-xs">
                <div className="flex items-center gap-2 text-primary-800 font-extrabold mb-1">
                  <Sparkles className="h-4 w-4" />
                  <span>Halo, {user?.name || "Kak"}!</span>
                </div>
                <p className="text-slate-600 leading-relaxed font-medium">
                  Selamat datang di Layanan Pelanggan resmi <b>Fastkredit</b>. Sampaikan pertanyaan seputar pengajuan Pinjaman, aktivasi limit, atau transaksi Anda.
                </p>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                </div>
              ) : messages.length === 0 ? (
                <div className="space-y-4 pt-2">
                  <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 space-y-2">
                    <p className="text-xs font-bold text-slate-700">Pertanyaan Populer:</p>
                    <div className="flex flex-col gap-1.5">
                      {QUICK_SUGGESTIONS.map((q, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendMessage(q)}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:border-primary-400 hover:bg-primary-50/50 hover:text-primary-800 transition"
                        >
                          💬 {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.sender_role === "user";
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-xs ${
                          isMe
                            ? "bg-gradient-to-r from-primary-700 to-primary-800 text-white rounded-br-none"
                            : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-none shadow-sm"
                        }`}
                      >
                        {!isMe && (
                          <span className="block text-[10px] font-extrabold text-primary-700 mb-0.5">
                            Customer Care
                          </span>
                        )}
                        {m.message && <p className="whitespace-pre-wrap break-words">{m.message}</p>}
                        {m.attachment && (
                          <div className="mt-2 overflow-hidden rounded-xl">
                            <a
                              href={fileUrl(m.attachment)}
                              target="_blank"
                              rel="noreferrer"
                              className="block"
                            >
                              <img
                                src={fileUrl(m.attachment)}
                                alt="Lampiran"
                                className="max-h-48 w-full object-cover rounded-xl hover:opacity-90 transition"
                              />
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-1 px-1 text-[10px] text-slate-400 font-semibold">
                        <span>{formatTime(m.created_at)}</span>
                        {isMe && (
                          m.is_read ? (
                            <CheckCheck className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Check className="h-3 w-3 text-slate-400" />
                          )
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Preview Foto Jika Ada */}
            {filePreview && (
              <div className="border-t border-slate-100 bg-white px-4 py-2 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <img
                    src={filePreview}
                    alt="Preview"
                    className="h-10 w-10 shrink-0 object-cover rounded-lg border border-slate-200"
                  />
                  <span className="text-xs font-semibold text-slate-600 truncate">
                    {selectedFile?.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Footer Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="border-t border-slate-100 bg-white p-3 flex items-center gap-2 shrink-0 min-w-0"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-primary-700 transition"
                title="Kirim Foto / Screenshot"
              >
                <ImagePlus className="h-5 w-5" />
              </button>

              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ketik pesan bantuan..."
                className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm sm:text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-primary-600 focus:bg-white focus:outline-none"
              />

              <button
                type="submit"
                disabled={sending || (!inputMessage.trim() && !selectedFile)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary-700 text-white shadow-md shadow-primary-700/30 hover:bg-primary-800 disabled:opacity-50 disabled:shadow-none transition active:scale-95"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
