import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { ArrowLeft, Check, Copy, ImagePlus, TriangleAlert, UploadCloud, X } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { get, upload } from "@/utils/request";
import { digitsOnly, formatRupiah } from "@/utils/format";

const PRESET_AMOUNTS = [20000, 50000, 100000, 200000, 500000, 1000000];

export default function TopUpModal({ open, onClose, onDone, initialAmount = "" }) {
  const [step, setStep] = useState("form"); // "form" | "confirm" | "upload"
  const [amount, setAmount] = useState("");
  const [banks, setBanks] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState(null);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState("");

  // Bukti pembayaran
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const fileInputRef = useRef(null);

  // Ambil daftar rekening bank aktif
  useEffect(() => {
    if (!open) return;
    setStep("form");
    setAmount(initialAmount ? String(initialAmount) : "");
    setProofFile(null);
    setProofPreview(null);
    setLoadingBanks(true);
    get(API_ENDPOINTS.BANKS.LIST)
      .then((res) => {
        const list = res.data || [];
        setBanks(list);
        if (list.length > 0) setSelectedBankId(list[0].id);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoadingBanks(false));
  }, [open]);

  const selectedBank = banks.find((b) => b.id === Number(selectedBankId)) || banks[0];

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    toast.success(`${fieldName} disalin ke clipboard`);
  };

  const handleProceedToConfirm = (e) => {
    e.preventDefault();
    const n = Number(amount);
    if (!n) return toast.error("Masukkan nominal top up");
    if (n < 10000) return toast.error("Minimal top up Rp 10.000");
    if (n > 50000000) return toast.error("Maksimal top up Rp 50.000.000");
    if (!selectedBank) return toast.error("Pilih rekening bank tujuan");

    const random10 = Math.floor(1000000000 + Math.random() * 9000000000);
    setReference(`USR${random10}`);
    setStep("confirm");
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      return toast.error("Ukuran foto maksimal 4MB");
    }
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = () => setProofPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveProof = () => {
    setProofFile(null);
    setProofPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmitWithProof = async () => {
    if (!proofFile) {
      return toast.error("Silakan pilih foto bukti transfer terlebih dahulu");
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("amount", Number(amount));
      fd.append("bank_id", selectedBank?.id);
      fd.append("bank_name", selectedBank?.bank_name);
      fd.append("account_number", selectedBank?.account_number);
      fd.append("account_name", selectedBank?.account_name);
      fd.append("reference", reference);
      fd.append("proof", proofFile);

      const res = await upload(API_ENDPOINTS.WALLET.TOPUP, fd);
      toast.success(res.message || "Bukti pembayaran berhasil diunggah! Menunggu verifikasi admin.");
      onDone?.();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={step === "form" ? "Top Up Saldo" : undefined}
    >
      {step === "form" && (
        <form onSubmit={handleProceedToConfirm} className="space-y-5" noValidate>
          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-400">
              Pilih Nominal Cepat
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_AMOUNTS.map((nom) => (
                <button
                  key={nom}
                  type="button"
                  onClick={() => setAmount(String(nom))}
                  className={`rounded-2xl border py-2.5 text-xs font-extrabold transition ${
                    Number(amount) === nom
                      ? "border-primary-600 bg-primary-50 text-primary-700 shadow-sm"
                      : "border-slate-100 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {formatRupiah(nom)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Input
              label="Nominal Lainnya"
              placeholder="Minimal Rp 10.000"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(digitsOnly(e.target.value))}
            />
            {amount ? (
              <p className="mt-1.5 text-sm font-extrabold text-primary-700">
                Total: {formatRupiah(amount)}
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-400">
              Pilih Rekening Bank Tujuan
            </label>
            {loadingBanks ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center text-sm font-semibold text-slate-400">
                Memuat data rekening...
              </div>
            ) : banks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm font-semibold text-slate-500">
                Belum ada rekening bank yang aktif. Silakan hubungi admin.
              </div>
            ) : (
              <div className="space-y-2">
                {banks.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBankId(b.id)}
                    className={`flex w-full items-center justify-between rounded-2xl border p-3.5 text-left transition ${
                      selectedBankId === b.id
                        ? "border-primary-600 bg-primary-50/70 ring-1 ring-primary-600"
                        : "border-slate-100 bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <div>
                      <p className="font-extrabold text-slate-900">{b.bank_name}</p>
                      <p className="text-xs font-semibold text-slate-500">
                        {b.account_number} · a.n {b.account_name}
                      </p>
                    </div>
                    {selectedBankId === b.id && (
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-primary-600 text-white">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button type="submit" disabled={!amount || banks.length === 0} className="w-full">
            Lanjut ke Konfirmasi
          </Button>
        </form>
      )}

      {step === "confirm" && (
        /* STEP 2: KONFIRMASI TOP UP (Sesuai Gambar Screenshot) */
        <div className="space-y-4">
          <h2 className="text-center text-xl font-extrabold text-slate-900">
            Konfirmasi Top Up
          </h2>

          {/* Ilustrasi Laptop Workspace */}
          <div className="my-2 flex justify-center">
            <svg
              className="h-28 w-44"
              viewBox="0 0 200 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <ellipse cx="100" cy="100" rx="80" ry="12" fill="#EEF2F6" />
              <rect x="52" y="58" width="16" height="24" rx="4" fill="#7C3AED" />
              <rect x="54" y="62" width="12" height="16" rx="2" fill="#C4B5FD" />
              <path d="M72 82L108 102L152 78L116 58L72 82Z" fill="#312E81" />
              <path d="M72 82L108 102L112 100L76 80L72 82Z" fill="#1E1B4B" />
              <path d="M84 79L110 93L140 76L116 64L84 79Z" fill="#4338CA" />
              <rect
                x="98"
                y="76"
                width="18"
                height="8"
                rx="1"
                transform="skewX(-25) rotate(15)"
                fill="#818CF8"
                opacity="0.9"
              />
              <path d="M116 58L148 20L158 25L126 63L116 58Z" fill="#1E1B4B" />
              <path d="M118 56L146 22L176 38L148 72L118 56Z" fill="#4F46E5" />
              <path d="M122 54L146 25L172 39L148 68L122 54Z" fill="url(#topupScreenGrad)" />
              <line x1="130" y1="48" x2="152" y2="38" stroke="#DDD6FE" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="133" y1="54" x2="162" y2="44" stroke="#C4B5FD" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="136" y1="60" x2="156" y2="52" stroke="#A78BFA" strokeWidth="2.5" strokeLinecap="round" />
              <defs>
                <linearGradient id="topupScreenGrad" x1="122" y1="25" x2="172" y2="68" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6366F1" />
                  <stop offset="1" stopColor="#9333EA" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Card Rincian Top Up */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-400">No Transaksi</span>
              <button
                type="button"
                onClick={() => handleCopy(reference, "No Transaksi")}
                className="group flex items-center gap-1.5 font-extrabold text-slate-800 hover:text-primary-700"
              >
                <span>{reference}</span>
                <Copy className="h-3.5 w-3.5 text-slate-400 group-hover:text-primary-600" />
              </button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-400">Bank Tujuan</span>
              <span className="font-extrabold text-slate-800">{selectedBank?.bank_name}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-400">No Rekening</span>
              <button
                type="button"
                onClick={() => handleCopy(selectedBank?.account_number, "No Rekening")}
                className="group flex items-center gap-1.5 font-extrabold text-slate-800 hover:text-primary-700"
              >
                <span>{selectedBank?.account_number}</span>
                <Copy className="h-3.5 w-3.5 text-slate-400 group-hover:text-primary-600" />
              </button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-400">Atas Nama</span>
              <span className="font-extrabold text-slate-800">{selectedBank?.account_name}</span>
            </div>

            <hr className="my-2 border-slate-200/80" />

            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-500">Total Bayar</span>
              <span className="text-xl font-black text-primary-700">
                {formatRupiah(amount)}
              </span>
            </div>
          </div>

          {/* Kotak Peringatan Warna Merah / Pink */}
          <div className="rounded-2xl border border-red-100 bg-red-50/80 p-4 text-center">
            <div className="mb-2 flex justify-center">
              <TriangleAlert className="h-7 w-7 text-red-500" />
            </div>
            <p className="text-xs font-bold leading-relaxed text-red-600">
              Pastikan sebelum transfer, Nama Rekening sudah sesuai dengan Nomor ID Akun
              aplikasi Anda di bagian menu akun.
            </p>
          </div>

          {/* Tombol Aksi: Batal & Lanjutkan (Menuju Step Upload Bukti) */}
          <div className="flex items-center gap-3 pt-3">
            <button
              type="button"
              onClick={() => setStep("form")}
              className="flex-1 rounded-2xl bg-slate-100 py-3.5 text-center font-extrabold text-slate-700 transition hover:bg-slate-200"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => setStep("upload")}
              className="flex-1 rounded-2xl bg-[#00c9a7] py-3.5 text-center font-extrabold text-white shadow-lg shadow-[#00c9a7]/30 transition hover:bg-[#00b596]"
            >
              Lanjutkan
            </button>
          </div>
        </div>
      )}

      {step === "upload" && (
        /* STEP 3: UPLOAD BUKTI BAYAR */
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-extrabold text-slate-900">
              Upload Bukti Pembayaran
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Unggah struk atau bukti transfer m-banking Anda untuk diverifikasi admin.
            </p>
          </div>

          {/* Ringkasan Singkat Transaksi */}
          <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-3.5 text-xs">
            <div>
              <p className="text-slate-400 font-bold">No Transaksi</p>
              <p className="font-extrabold text-slate-800">{reference}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 font-bold">Total Transfer</p>
              <p className="font-black text-primary-700 text-sm">{formatRupiah(amount)}</p>
            </div>
          </div>

          {/* Upload Area Box */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {!proofPreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-6 text-center cursor-pointer transition hover:border-primary-500 hover:bg-primary-50/20"
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-100 text-primary-700 transition group-hover:scale-105">
                <UploadCloud className="h-7 w-7" />
              </span>
              <p className="mt-3 text-sm font-extrabold text-slate-800">
                Pilih Foto Bukti Transfer
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                Format JPG, PNG, atau WEBP (Maksimal 4MB)
              </p>
              <button
                type="button"
                className="mt-4 rounded-xl bg-white px-4 py-2 text-xs font-black text-primary-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
              >
                Pilih File dari Galeri
              </button>
            </div>
          ) : (
            <div className="relative rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="relative overflow-hidden rounded-2xl bg-slate-100 max-h-56 flex justify-center">
                <img
                  src={proofPreview}
                  alt="Pratinjau Bukti Transfer"
                  className="max-h-56 w-auto object-contain"
                />
                <button
                  type="button"
                  onClick={handleRemoveProof}
                  className="absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-slate-900/70 text-white hover:bg-slate-900 transition"
                  title="Hapus foto"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2.5 flex items-center justify-between px-1 text-xs">
                <span className="truncate max-w-[200px] font-bold text-slate-700">
                  {proofFile?.name}
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="font-extrabold text-primary-700 hover:underline"
                >
                  Ganti Foto
                </button>
              </div>
            </div>
          )}

          {/* Tombol Aksi */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep("confirm")}
              disabled={submitting}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-slate-100 py-3.5 px-4 font-extrabold text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </button>
            <button
              type="button"
              onClick={handleSubmitWithProof}
              disabled={submitting || !proofFile}
              className="flex-1 rounded-2xl bg-primary-700 py-3.5 text-center font-extrabold text-white shadow-lg shadow-primary-700/30 transition hover:bg-primary-800 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? "Mengunggah..." : "Kirim Bukti Pembayaran"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
