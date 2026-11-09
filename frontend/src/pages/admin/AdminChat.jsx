import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Send,
  ImagePlus,
  Loader2,
  Check,
  CheckCheck,
  Headphones,
  User,
  X,
  ArrowLeft,
  Sparkles,
  Phone,
  Mail,
  Wallet,
  CreditCard,
  MessageSquare,
  Volume2,
} from "lucide-react";
import toast from "react-hot-toast";
import useDebounce from "@/hooks/useDebounce";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { get, post, upload } from "@/utils/request";
import { formatTime, formatDateTime, formatRupiah, fileUrl } from "@/utils/format";
import Button from "@/components/ui/Button";
import { playChatNotificationSound } from "@/utils/sound";

const QUICK_REPLIES = [
  "Halo kak, ada yang bisa kami bantu seputar akun Anda?",
  "Pengajuan Pinjaman Anda sedang dalam proses verifikasi tim analis kami ya kak.",
  "Dokumen Anda telah kami terima dengan baik. Mohon menunggu proses approval.",
  "Limit Pinjaman Anda sudah berhasil kami setujui dan aktif ya kak. Selamat menikmati kemudahan bertransaksi!",
  "Terima kasih telah menghubungi Customer Care Fastkredit.",
];

export default function AdminChat() {
  const [conversations, setConversations] = useState([]);
  const [loadingConv, setLoadingConv] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);

  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [replyText, setReplyText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [sending, setSending] = useState(false);

  const fileInputRef = useRef(null);
  const chatBodyRef = useRef(null);
  const messagesEndRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const prevConvMapRef = useRef(new Map());
  const latestIdRef = useRef(null);
  const seenIdsRef = useRef(new Set());

  // Fetch daftar percakapan
  const fetchConversations = useCallback(async (isInitial = false) => {
    if (isInitial) setLoadingConv(true);
    try {
      const res = await get(API_ENDPOINTS.ADMIN.CHAT.CONVERSATIONS, {
        search: debouncedSearch,
      });
      const data = res.data || [];
      if (!isInitial) {
        let hasIncoming = false;
        data.forEach((c) => {
          const prev = prevConvMapRef.current.get(c.user_id);
          if (prev && c.last_message_at !== prev.last_message_at && c.last_sender_role === "user") {
            hasIncoming = true;
          }
        });
        if (hasIncoming) {
          playChatNotificationSound();
        }
      }
      const nextMap = new Map();
      data.forEach((c) => nextMap.set(c.user_id, { last_message_at: c.last_message_at }));
      prevConvMapRef.current = nextMap;

      setConversations(data);
      if (isInitial && data.length > 0 && !selectedUser && window.innerWidth >= 1024) {
        setSelectedUser(data[0]);
      }
    } catch (err) {
      console.warn("Gagal mengambil percakapan:", err);
    } finally {
      if (isInitial) setLoadingConv(false);
    }
  }, [debouncedSearch, selectedUser]);

  useEffect(() => {
    fetchConversations(true);
  }, [debouncedSearch]);

  useEffect(() => {
    const timer = setInterval(() => {
      fetchConversations(false);
    }, 4000);
    return () => clearInterval(timer);
  }, [fetchConversations]);

  // Fetch 50 pesan pertama dari user terpilih
  const fetchInitialMessages = useCallback(async (userId) => {
    if (!userId) return;
    setLoadingMessages(true);
    try {
      const res = await get(API_ENDPOINTS.ADMIN.CHAT.MESSAGES(userId), { limit: 50 });
      const list = res.data || [];
      seenIdsRef.current = new Set(list.map((m) => m.id));
      latestIdRef.current = list.length > 0 ? list[list.length - 1]?.id : null;
      setMessages(list);
      setHasMore(!!res.hasMore);
      setTimeout(() => {
        if (chatBodyRef.current) {
          chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
      }, 100);
    } catch (err) {
      console.warn("Gagal mengambil pesan:", err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Infinite scroll memuat 50 pesan sebelumnya (ke atas)
  const loadOlderMessages = async () => {
    if (!hasMore || loadingMore || messages.length === 0 || !selectedUser?.user_id) return;
    const oldestId = messages[0]?.id;
    if (!oldestId) return;

    setLoadingMore(true);
    const container = chatBodyRef.current;
    const prevScrollHeight = container ? container.scrollHeight : 0;

    try {
      const res = await get(API_ENDPOINTS.ADMIN.CHAT.MESSAGES(selectedUser.user_id), {
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

  // Polling pesan baru dari user
  const pollNewMessages = useCallback(async () => {
    if (!selectedUser?.user_id || loadingMessages) return;
    const latestId = latestIdRef.current;

    try {
      const res = await get(
        API_ENDPOINTS.ADMIN.CHAT.MESSAGES(selectedUser.user_id),
        latestId ? { afterId: latestId } : { limit: 50 }
      );
      const newMessages = res.data || [];
      const freshMessages = newMessages.filter((m) => !seenIdsRef.current.has(m.id));
      if (freshMessages.length > 0) {
        freshMessages.forEach((m) => seenIdsRef.current.add(m.id));
        latestIdRef.current = freshMessages[freshMessages.length - 1]?.id || latestId;

        if (freshMessages.some((m) => m.sender_role === "user")) {
          playChatNotificationSound();
        }
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const filtered = freshMessages.filter((m) => !existingIds.has(m.id));
          return filtered.length > 0 ? [...prev, ...filtered] : prev;
        });

        if (isNearBottomRef.current && chatBodyRef.current) {
          setTimeout(() => {
            if (chatBodyRef.current) {
              chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
            }
          }, 50);
        }
      }
    } catch {}
  }, [selectedUser?.user_id, loadingMessages]);

  // Load awal pesan saat user berubah
  useEffect(() => {
    if (selectedUser?.user_id) {
      isNearBottomRef.current = true;
      fetchInitialMessages(selectedUser.user_id);
    } else {
      setMessages([]);
      setHasMore(false);
      latestIdRef.current = null;
      seenIdsRef.current = new Set();
    }
  }, [selectedUser?.user_id, fetchInitialMessages]);

  // Polling pesan baru setiap 3 detik
  useEffect(() => {
    if (selectedUser?.user_id && !loadingMessages) {
      const timer = setInterval(pollNewMessages, 3000);
      return () => clearInterval(timer);
    }
  }, [selectedUser?.user_id, loadingMessages, pollNewMessages]);

  const handleScroll = () => {
    const el = chatBodyRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;

    // Trigger infinite scroll ke atas
    if (el.scrollTop <= 30 && hasMore && !loadingMore && !loadingMessages) {
      loadOlderMessages();
    }
  };

  const handleSelectUser = (userItem) => {
    setSelectedUser(userItem);
    setConversations((prev) =>
      prev.map((c) =>
        c.user_id === userItem.user_id ? { ...c, unread_count: 0 } : c
      )
    );
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      return toast.error("Ukuran file maksimal 5 MB");
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

  const handleSendReply = async (customText = null) => {
    const text = (typeof customText === "string" ? customText : replyText).trim();
    if (!selectedUser?.user_id || (!text && !selectedFile)) return;

    setSending(true);
    try {
      let res;
      if (selectedFile) {
        const form = new FormData();
        form.append("message", text);
        form.append("attachment", selectedFile);
        res = await upload(API_ENDPOINTS.ADMIN.CHAT.MESSAGES(selectedUser.user_id), form);
      } else {
        res = await post(API_ENDPOINTS.ADMIN.CHAT.MESSAGES(selectedUser.user_id), {
          message: text,
        });
      }

      setReplyText("");
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
      fetchConversations(false);
    } catch (err) {
      toast.error(err.message || "Gagal mengirim balasan");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header (pada mobile disembunyikan saat percakapan aktif agar layar chat muat penuh) */}
      <div className={`flex-wrap items-center justify-between gap-3 ${selectedUser ? "hidden lg:flex" : "flex"}`}>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Live Chat Customer Care</h1>
          <p className="text-xs font-semibold text-slate-500">
            Layanan pesan interaktif dua arah antara Admin dan Pengguna Fastkredit secara real-time.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            playChatNotificationSound();
            toast.success("Nada dering notifikasi chat aktif 🔔");
          }}
          className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 transition"
          title="Uji coba nada dering notifikasi pesan masuk"
        >
          <Volume2 className="h-4 w-4 text-emerald-600" />
          <span>Tes Suara Notif</span>
        </button>
      </div>

      {/* Main Container 2 Kolom */}
      <div
        className={`w-full max-w-full overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100 flex ${
          selectedUser
            ? "h-[calc(100dvh-6.25rem)] lg:h-[78vh] min-h-[380px]"
            : "h-[calc(100dvh-12.5rem)] lg:h-[78vh] min-h-[420px]"
        } lg:min-h-[550px]`}
      >
        {/* Kolom Kiri: Daftar Pengguna */}
        <div
          className={`w-full min-w-0 lg:w-80 lg:shrink-0 flex-col min-h-0 border-r border-slate-100 ${
            selectedUser ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Search Box */}
          <div className="p-3.5 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari user, no HP..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-primary-600 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* List Users */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {loadingConv ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs font-medium text-slate-400">
                <MessageSquare className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                Belum ada percakapan dari pengguna.
              </div>
            ) : (
              conversations.map((c) => {
                const isSelected = selectedUser?.user_id === c.user_id;
                return (
                  <button
                    key={c.user_id}
                    type="button"
                    onClick={() => handleSelectUser(c)}
                    className={`w-full p-3.5 text-left transition flex items-start gap-3 hover:bg-slate-50 ${
                      isSelected ? "bg-primary-50/70 border-l-4 border-primary-700" : ""
                    }`}
                  >
                    <div className="relative shrink-0">
                      {c.avatar ? (
                        <img
                          src={fileUrl(c.avatar)}
                          alt={c.name}
                          className="h-10 w-10 rounded-2xl object-cover ring-1 ring-slate-200"
                        />
                      ) : (
                        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 text-white font-extrabold text-sm shadow-xs">
                          {c.name?.slice(0, 1).toUpperCase() || "U"}
                        </div>
                      )}
                      {c.unread_count > 0 && (
                        <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white ring-2 ring-white">
                          {c.unread_count}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-extrabold text-slate-900 truncate">
                          {c.name}
                        </p>
                        <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                          {formatTime(c.last_message_at)}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-500 truncate mt-0.5">
                        {c.last_sender_role === "admin" ? (
                          <span className="text-primary-700 font-bold">Anda: </span>
                        ) : null}
                        {c.last_message || "(Kirim foto)"}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Kolom Kanan: Jendela Percakapan Aktif */}
        <div
          className={`flex-1 min-w-0 w-full min-h-0 flex-col overflow-hidden bg-slate-50/50 ${
            !selectedUser ? "hidden lg:flex items-center justify-center" : "flex"
          }`}
        >
          {selectedUser ? (
            <>
              {/* Header Chat */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-white px-3 sm:px-4 py-2.5 sm:py-3 shrink-0 min-w-0">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    aria-label="Kembali ke daftar percakapan"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>

                  <div className="grid h-9 w-9 sm:h-10 sm:w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 text-white font-black text-sm">
                    {selectedUser.name?.slice(0, 1).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-black text-slate-900 truncate">{selectedUser.name}</h2>
                    <p className="text-[11px] sm:text-xs font-semibold text-slate-400 truncate">
                      @{selectedUser.username} • {selectedUser.phone}
                    </p>
                  </div>
                </div>

                {/* Badges Info Saldo & Limit PayLater User */}
                <div className="hidden sm:flex items-center gap-2 text-xs shrink-0">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold text-slate-700">
                    <span className="text-slate-400 font-normal">Saldo: </span>
                    {formatRupiah(selectedUser.balance || 0)}
                  </div>
                  <div className="rounded-xl border border-primary-200 bg-primary-50 px-3 py-1.5 font-bold text-primary-800">
                    <span className="text-primary-600/70 font-normal">Pinjaman: </span>
                    {formatRupiah(selectedUser.paylater_limit || 0)}
                  </div>
                </div>
              </div>

              {/* Strip Info Saldo & Pinjaman khusus Mobile */}
              <div className="flex sm:hidden items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-600 shrink-0">
                <span className="truncate">
                  Saldo: <b className="text-slate-800">{formatRupiah(selectedUser.balance || 0)}</b>
                </span>
                <span className="truncate text-primary-700">
                  Pinjaman: <b>{formatRupiah(selectedUser.paylater_limit || 0)}</b>
                </span>
              </div>

              {/* Message History Area dengan Infinite Scroll */}
              <div
                ref={chatBodyRef}
                onScroll={handleScroll}
                className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3"
              >
                {/* Indicator / Tombol Infinite Scroll ke atas */}
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

                {loadingMessages ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-16 text-center text-xs font-medium text-slate-400">
                    Belum ada percakapan dengan pengguna ini.
                  </div>
                ) : (
                  messages.map((m) => {
                    const isAdmin = m.sender_role === "admin";
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-xs ${
                            isAdmin
                              ? "bg-gradient-to-r from-primary-700 to-primary-900 text-white rounded-br-none"
                              : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-none shadow-sm"
                          }`}
                        >
                          {!isAdmin && (
                            <span className="block text-[10px] font-extrabold text-primary-700 mb-0.5">
                              {selectedUser.name}
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
                                  className="max-h-56 w-full object-cover rounded-xl hover:opacity-90 transition"
                                />
                              </a>
                            </div>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-1 px-1 text-[10px] text-slate-400 font-semibold">
                          <span>{formatTime(m.created_at)}</span>
                          {isAdmin && (
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

              {/* Quick Replies Bar */}
              <div className="w-full min-w-0 shrink-0 border-t border-slate-100 bg-white px-3 sm:px-4 py-2 overflow-x-auto flex items-center gap-1.5 scrollbar-none">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">
                  Quick Reply:
                </span>
                {QUICK_REPLIES.map((qr, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendReply(qr)}
                    className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:border-primary-400 hover:bg-primary-50/50 hover:text-primary-800 transition whitespace-nowrap"
                  >
                    {qr.slice(0, 30)}...
                  </button>
                ))}
              </div>

              {/* File Preview Jika Ada */}
              {filePreview && (
                <div className="border-t border-slate-100 bg-white px-3 sm:px-4 py-2 flex items-center justify-between gap-2 shrink-0 min-w-0">
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

              {/* Input Form Reply */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendReply();
                }}
                className="w-full min-w-0 border-t border-slate-100 bg-white px-2.5 py-2.5 sm:p-3 flex items-center gap-1.5 sm:gap-2 shrink-0"
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
                  title="Lampirkan Gambar"
                >
                  <ImagePlus className="h-5 w-5" />
                </button>

                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ketik balasan CS..."
                  className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 sm:px-4 py-2.5 text-sm sm:text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-primary-600 focus:bg-white focus:outline-none"
                />

                <Button
                  type="submit"
                  loading={sending}
                  disabled={!replyText.trim() && !selectedFile}
                  icon={Send}
                  className="!px-3.5 !py-2.5 sm:!px-5 sm:!py-3 text-xs sm:text-sm shrink-0 bg-primary-700 hover:bg-primary-800 text-white font-bold"
                >
                  Kirim
                </Button>
              </form>
            </>
          ) : (
            <div className="p-8 text-center text-xs font-semibold text-slate-400 space-y-2">
              <Headphones className="mx-auto h-12 w-12 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">Pilih Percakapan</p>
              <p>Pilih salah satu pengguna di sebelah kiri untuk melihat dan membalas pesan.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
