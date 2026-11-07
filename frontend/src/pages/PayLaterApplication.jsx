import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  User,
  Briefcase,
  FolderPlus,
  Lock,
  Banknote,
  Upload,
  Info,
  Clock,
  CheckCircle2,
  ImagePlus,
  Camera,
  CreditCard,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Users,
  Receipt,
  BriefcaseMedical,
  GraduationCap,
  Globe,
  Sparkles,
  ShieldCheck,
  Zap,
  Calendar,
  Calculator,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { get, upload } from "@/utils/request";
import { formatRupiah, digitsOnly, fileUrl } from "@/utils/format";
import {
  getProvinces,
  getRegencies,
  getDistricts,
  getVillages,
} from "@/utils/wilayah";
import { compressImage } from "@/utils/imageCompressor";
import ApprovalLetterDocument, { LETTER_MODELS } from "@/components/paylater/ApprovalLetterDocument";

const LOAN_AMOUNT_OPTIONS = [
  5000000,
  10000000,
  20000000,
  50000000,
  75000000,
  100000000,
  150000000,
  200000000,
  250000000,
  300000000,
  400000000,
  500000000,
];

const TENOR_OPTIONS = [
  { value: 12, label: "12 Bulan" },
  { value: 24, label: "24 Bulan" },
  { value: 36, label: "36 Bulan" },
  { value: 48, label: "48 Bulan" },
  { value: 60, label: "60 Bulan" },
];

const TENOR_VALUES = [12, 24, 36, 48, 60];

export default function PayLaterApplication() {
  const navigate = useNavigate();
  const [stage, setStage] = useState("aktivasi"); // "riwayat" | "aktivasi" | "simulasi" | "lengkapi_data" | "data_nasabah" | "data_tambahan"
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [application, setApplication] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [openSuratModal, setOpenSuratModal] = useState(false);
  const [activeLetterModelTab, setActiveLetterModelTab] = useState(null);

  // Template Surat Resmi Persetujuan Pinjaman (Dapat diedit oleh Admin di Pengaturan)
  const [letterTemplate, setLetterTemplate] = useState({
    letter_layout_model: "model_1",
    letter_company_name: "PT KREDITPAY INDONESIA",
    letter_title: "SURAT PEMBERITAHUAN\nPERSETUJUAN PENGAJUAN PINJAMAN",
    letter_number_prefix: "KP/APP",
    letter_opening:
      "Berdasarkan hasil proses evaluasi dan verifikasi terhadap pengajuan pinjaman yang Anda ajukan melalui {company_name}, dengan ini kami memberitahukan bahwa pengajuan pinjaman Anda telah DISETUJUI, dengan rincian sebagai berikut:",
    letter_rules_min_topup: "Rp 1.000.000 (satu juta rupiah)",
    letter_rules_content: `- Silakan refresh saldo PayLater Anda\n- Tanda akun Anda aktif yaitu adanya logo "Verifikasi" pada akun Anda.\n- Jika ingin melakukan pencairan saldo PayLater.\n- Nasabah diwajibkan isi saldo ke aplikasi agar fitur menu transfer dan menu-menu lainnya dapat diakses minimal:\n[TOPUP_HIGHLIGHT]\n- Dana top-up nasabah dikirim ke rekening perusahaan sesuai dengan nomor ID akun pemohon.\n- Top-up atau isi saldo ini digunakan untuk membuka dan mengakses menu serta fitur yang ada dalam aplikasi kami.\n- Top-up atau isi saldo ini akan dicairkan bersamaan dengan pencairan PayLater Anda nantinya. "Hanya bersifat sementara". Top-up ini hanya untuk membuka fitur "Transfer" agar limit PayLater Anda bisa dicairkan ke rekening melalui menu transfer.`,
    letter_closing:
      "Demikian surat pemberitahuan ini kami sampaikan. Terima kasih atas kepercayaan Anda kepada {company_name}.",
    letter_signer: "Tim Operasional",
    letter_important_notes:
      "Jaga kerahasiaan akun dan data pribadi Anda. {company_name} tidak meminta PIN, OTP, atau password kepada siapapun melalui media lainnya.",
  });

  const formatLetterNumber = (appId, dateStr, prefix = "KP/APP") => {
    const d = dateStr ? new Date(dateStr) : new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const paddedId = String(appId || 1).padStart(6, "0");
    return `${prefix || "KP/APP"}/${mm}${yyyy}/${paddedId}`;
  };

  const formatApplicationCode = (appId, dateStr) => {
    const d = dateStr ? new Date(dateStr) : new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const paddedId = String(appId || 1).padStart(6, "0");
    return `PINJ-${yyyy}${mm}-${paddedId}`;
  };

  const formatFormalDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatFormalDateTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const datePart = d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${datePart}, ${hours}:${minutes} WIB`;
  };

  const formatDiajukanDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  };

  // Simulasi Pinjaman states (Model Slider Interaktif)
  const [requestedAmount, setRequestedAmount] = useState(300000000);
  const [requestedTenor, setRequestedTenor] = useState(12);
  const [openSyaratModal, setOpenSyaratModal] = useState(false);
  const [openPersetujuanModal, setOpenPersetujuanModal] = useState(false);
  const [agreedChecked, setAgreedChecked] = useState(false);

  // Perhitungan bunga flat 2% per tahun (0.1667% per bulan)
  const calculateDetails = (amount, tenor) => {
    const annualInterestRate = 0.02;
    const totalInterest = Math.round(amount * annualInterestRate * (tenor / 12));
    const totalAmount = amount + totalInterest;
    const monthly = Math.round(totalAmount / tenor);
    return { totalInterest, totalAmount, monthly };
  };

  const {
    totalInterest,
    totalAmount: totalPayment,
    monthly: monthlyInstallment,
  } = calculateDetails(requestedAmount, requestedTenor);

  // Perhitungan tanggal jatuh tempo dinamis
  const getDueDate = (tenorMonths) => {
    const d = new Date();
    d.setMonth(d.getMonth() + Number(tenorMonths));
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };

  // Open API Wilayah states
  const [provinces, setProvinces] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);

  // KTP Wilayah states
  const [ktpProvinceCode, setKtpProvinceCode] = useState("");
  const [ktpRegencies, setKtpRegencies] = useState([]);
  const [loadingKtpRegencies, setLoadingKtpRegencies] = useState(false);
  const [ktpRegencyCode, setKtpRegencyCode] = useState("");
  const [ktpDistricts, setKtpDistricts] = useState([]);
  const [loadingKtpDistricts, setLoadingKtpDistricts] = useState(false);
  const [ktpDistrictCode, setKtpDistrictCode] = useState("");
  const [ktpVillages, setKtpVillages] = useState([]);
  const [loadingKtpVillages, setLoadingKtpVillages] = useState(false);

  // Domisili Wilayah states
  const [domicileProvinceCode, setDomicileProvinceCode] = useState("");
  const [domicileRegencies, setDomicileRegencies] = useState([]);
  const [loadingDomicileRegencies, setLoadingDomicileRegencies] = useState(false);
  const [domicileRegencyCode, setDomicileRegencyCode] = useState("");
  const [domicileDistricts, setDomicileDistricts] = useState([]);
  const [loadingDomicileDistricts, setLoadingDomicileDistricts] = useState(false);
  const [domicileDistrictCode, setDomicileDistrictCode] = useState("");
  const [domicileVillages, setDomicileVillages] = useState([]);
  const [loadingDomicileVillages, setLoadingDomicileVillages] = useState(false);

  // Modals for other sections
  const [openPekerjaanModal, setOpenPekerjaanModal] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    // 1. Data Nasabah & Identitas
    fullName: "",
    nik: "",
    birth_place: "",
    birth_date: "",
    mother_name: "",
    // Alamat KTP
    ktp_address: "",
    ktp_province: "",
    ktp_city: "",
    ktp_district: "",
    ktp_village: "",
    // Domisili Saat Ini
    same_as_ktp: false,
    domicile_address: "",
    domicile_province: "",
    domicile_city: "",
    domicile_district: "",
    domicile_village: "",
    residence_years: "",
    // Kontak Kerabat
    emergency_name: "",
    emergency_relation: "ORANG TUA",
    emergency_phone: "",
    emergency_address: "",
    // 2. Data Pekerjaan
    job_type: "Karyawan Swasta",
    company_name: "",
    monthly_income: "8000000",
    work_duration: "2 Tahun",
  });

  // Files Identitas
  const [ktpFile, setKtpFile] = useState(null);
  const [ktpPreview, setKtpPreview] = useState(null);
  const [ktpBackFile, setKtpBackFile] = useState(null);
  const [ktpBackPreview, setKtpBackPreview] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);

  // Files Data Tambahan (Dokumen Pendukung)
  const [kkFile, setKkFile] = useState(null);
  const [kkPreview, setKkPreview] = useState(null);
  const [slipGajiFile, setSlipGajiFile] = useState(null);
  const [slipGajiPreview, setSlipGajiPreview] = useState(null);
  const [npwpFile, setNpwpFile] = useState(null);
  const [npwpPreview, setNpwpPreview] = useState(null);
  const [bpjsFile, setBpjsFile] = useState(null);
  const [bpjsPreview, setBpjsPreview] = useState(null);
  const [ijazahFile, setIjazahFile] = useState(null);
  const [ijazahPreview, setIjazahPreview] = useState(null);
  const [passportFile, setPassportFile] = useState(null);
  const [passportPreview, setPassportPreview] = useState(null);

  const ktpInputRef = useRef(null);
  const ktpBackInputRef = useRef(null);
  const selfieInputRef = useRef(null);

  const kkInputRef = useRef(null);
  const slipGajiInputRef = useRef(null);
  const npwpInputRef = useRef(null);
  const bpjsInputRef = useRef(null);
  const ijazahInputRef = useRef(null);
  const passportInputRef = useRef(null);

  // Section completion status
  const [nasabahComplete, setNasabahComplete] = useState(false);
  const [pekerjaanComplete, setPekerjaanComplete] = useState(false);
  const [tambahanComplete, setTambahanComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Ambil data provinsi dari Open API wilayah.id saat mount
  useEffect(() => {
    setLoadingProvinces(true);
    getProvinces()
      .then((data) => setProvinces(data || []))
      .catch((err) => console.warn("Gagal memuat provinsi:", err))
      .finally(() => setLoadingProvinces(false));
  }, []);

  // Ambil status pengajuan yang sudah ada & template surat
  useEffect(() => {
    get(API_ENDPOINTS.PAYLATER.STATUS)
      .then((res) => {
        if (res.data) {
          const appData = res.data.id ? res.data : res.data.application || null;
          if (res.data.letter_template) {
            setLetterTemplate((prev) => ({ ...prev, ...res.data.letter_template }));
          }
          if (res.data.user_info) {
            setUserInfo(res.data.user_info);
          }
          if (appData && appData.id) {
            setApplication(appData);
            setStage("riwayat"); // Otomatis tampilkan Riwayat Pinjaman jika sudah pernah mengajukan
            if (appData.requested_amount) setRequestedAmount(Number(appData.requested_amount));
            if (appData.requested_tenor) setRequestedTenor(Number(appData.requested_tenor));
            setNasabahComplete(true);
            setPekerjaanComplete(true);
            setTambahanComplete(!!appData.kk_image);
            if (appData.ktp_image) setKtpPreview(appData.ktp_image);
            if (appData.ktp_back_image) setKtpBackPreview(appData.ktp_back_image);
            if (appData.selfie_image) setSelfiePreview(appData.selfie_image);
            if (appData.kk_image) setKkPreview(appData.kk_image);
            if (appData.slip_gaji_image) setSlipGajiPreview(appData.slip_gaji_image);
            if (appData.npwp_image) setNpwpPreview(appData.npwp_image);
            if (appData.bpjs_image) setBpjsPreview(appData.bpjs_image);
            if (appData.ijazah_image) setIjazahPreview(appData.ijazah_image);
            if (appData.passport_image) setPassportPreview(appData.passport_image);
            setFormData((f) => ({
              ...f,
              fullName: appData.full_name || "",
              nik: appData.nik || "",
              birth_place: appData.birth_place || "",
              birth_date: appData.birth_date || "",
              mother_name: appData.mother_name || "",
              ktp_address: appData.ktp_address || "",
              ktp_province: appData.ktp_province || "",
              ktp_city: appData.ktp_city || "",
              ktp_district: appData.ktp_district || "",
              ktp_village: appData.ktp_village || "",
              domicile_address: appData.domicile_address || "",
              domicile_province: appData.domicile_province || "",
              domicile_city: appData.domicile_city || "",
              domicile_district: appData.domicile_district || "",
              domicile_village: appData.domicile_village || "",
              residence_years: appData.residence_years || "",
              emergency_name: appData.emergency_name || "",
              emergency_relation: appData.emergency_relation || "ORANG TUA",
              emergency_phone: appData.emergency_phone || "",
              emergency_address: appData.emergency_address || "",
              job_type: appData.job_type || "Karyawan Swasta",
              company_name: appData.company_name || "",
              monthly_income: String(appData.monthly_income || "8000000"),
            }));
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingStatus(false));
  }, []);

  // Sinkronisasi data wilayah tersimpan dengan API wilayah.id
  useEffect(() => {
    if (!application || provinces.length === 0) return;

    // Sinkronisasi Wilayah KTP
    if (application.ktp_province) {
      const p = provinces.find(
        (x) => x.name.toLowerCase() === application.ktp_province.toLowerCase()
      );
      if (p) {
        setKtpProvinceCode(p.code);
        getRegencies(p.code).then((regs) => {
          setKtpRegencies(regs);
          if (application.ktp_city) {
            const r = regs.find(
              (x) => x.name.toLowerCase() === application.ktp_city.toLowerCase()
            );
            if (r) {
              setKtpRegencyCode(r.code);
              getDistricts(r.code).then((dists) => {
                setKtpDistricts(dists);
                if (application.ktp_district) {
                  const d = dists.find(
                    (x) => x.name.toLowerCase() === application.ktp_district.toLowerCase()
                  );
                  if (d) {
                    setKtpDistrictCode(d.code);
                    getVillages(d.code).then((vils) => {
                      setKtpVillages(vils);
                    });
                  }
                }
              });
            }
          }
        });
      }
    }

    // Sinkronisasi Wilayah Domisili
    if (application.domicile_province) {
      const p = provinces.find(
        (x) => x.name.toLowerCase() === application.domicile_province.toLowerCase()
      );
      if (p) {
        setDomicileProvinceCode(p.code);
        getRegencies(p.code).then((regs) => {
          setDomicileRegencies(regs);
          if (application.domicile_city) {
            const r = regs.find(
              (x) => x.name.toLowerCase() === application.domicile_city.toLowerCase()
            );
            if (r) {
              setDomicileRegencyCode(r.code);
              getDistricts(r.code).then((dists) => {
                setDomicileDistricts(dists);
                if (application.domicile_district) {
                  const d = dists.find(
                    (x) => x.name.toLowerCase() === application.domicile_district.toLowerCase()
                  );
                  if (d) {
                    setDomicileDistrictCode(d.code);
                    getVillages(d.code).then((vils) => {
                      setDomicileVillages(vils);
                    });
                  }
                }
              });
            }
          }
        });
      }
    }
  }, [application, provinces]);

  // Hitung persentase kelengkapan
  const calculateProgress = () => {
    if (application) return 100;
    let count = 0;
    if (nasabahComplete) count += 35;
    if (pekerjaanComplete) count += 35;
    if (tambahanComplete) count += 30;
    return count;
  };

  const progress = calculateProgress();

  // Helper resolusi URL gambar (blob vs backend uploads)
  const resolveDocUrl = (p) => {
    if (!p) return "";
    if (p.startsWith("blob:") || p.startsWith("data:") || p.startsWith("http")) return p;
    return fileUrl(p);
  };

  // Helper upload file dokumen pendukung (Data Tambahan)
  const handleDocFileChange = async (e, setFile, setPreview, label) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return toast.error("Format foto harus JPG, PNG, atau WEBP");
    }
    if (file.size > 25 * 1024 * 1024) {
      return toast.error("Ukuran maksimal 25MB");
    }
    try {
      const compressed = await compressImage(file);
      setFile(compressed);
      setPreview(URL.createObjectURL(compressed));
      toast.success(`${label} berhasil dipilih`);
    } catch {
      setFile(file);
      setPreview(URL.createObjectURL(file));
      toast.success(`${label} berhasil dipilih`);
    }
  };

  // Handler file KTP Depan
  const handleKtpChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return toast.error("Format foto harus JPG, PNG, atau WEBP");
    }
    if (file.size > 25 * 1024 * 1024) {
      return toast.error("Ukuran maksimal 25MB");
    }
    try {
      const compressed = await compressImage(file);
      setKtpFile(compressed);
      setKtpPreview(URL.createObjectURL(compressed));
    } catch {
      setKtpFile(file);
      setKtpPreview(URL.createObjectURL(file));
    }
  };

  // Handler file KTP Belakang
  const handleKtpBackChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return toast.error("Format foto harus JPG, PNG, atau WEBP");
    }
    if (file.size > 25 * 1024 * 1024) {
      return toast.error("Ukuran maksimal 25MB");
    }
    try {
      const compressed = await compressImage(file);
      setKtpBackFile(compressed);
      setKtpBackPreview(URL.createObjectURL(compressed));
    } catch {
      setKtpBackFile(file);
      setKtpBackPreview(URL.createObjectURL(file));
    }
  };

  // Handler file Selfie
  const handleSelfieChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return toast.error("Format foto harus JPG, PNG, atau WEBP");
    }
    if (file.size > 25 * 1024 * 1024) {
      return toast.error("Ukuran maksimal 25MB");
    }
    try {
      const compressed = await compressImage(file);
      setSelfieFile(compressed);
      setSelfiePreview(URL.createObjectURL(compressed));
    } catch {
      setSelfieFile(file);
      setSelfiePreview(URL.createObjectURL(file));
    }
  };

  // Handler Pemilihan Wilayah KTP (Open API wilayah.id)
  const handleKtpProvinceChange = async (e) => {
    const code = e.target.value;
    const selected = provinces.find((p) => p.code === code);
    const name = selected ? selected.name : "";

    setKtpProvinceCode(code);
    setKtpRegencyCode("");
    setKtpDistrictCode("");
    setKtpRegencies([]);
    setKtpDistricts([]);
    setKtpVillages([]);

    setFormData((f) => ({
      ...f,
      ktp_province: name,
      ktp_city: "",
      ktp_district: "",
      ktp_village: "",
      ...(f.same_as_ktp
        ? {
            domicile_province: name,
            domicile_city: "",
            domicile_district: "",
            domicile_village: "",
          }
        : {}),
    }));

    if (code) {
      setLoadingKtpRegencies(true);
      const regList = await getRegencies(code);
      setKtpRegencies(regList);
      setLoadingKtpRegencies(false);

      if (formData.same_as_ktp) {
        setDomicileProvinceCode(code);
        setDomicileRegencies(regList);
        setDomicileRegencyCode("");
        setDomicileDistricts([]);
        setDomicileVillages([]);
      }
    }
  };

  const handleKtpCityChange = async (e) => {
    const code = e.target.value;
    const selected = ktpRegencies.find((r) => r.code === code);
    const name = selected ? selected.name : "";

    setKtpRegencyCode(code);
    setKtpDistrictCode("");
    setKtpDistricts([]);
    setKtpVillages([]);

    setFormData((f) => ({
      ...f,
      ktp_city: name,
      ktp_district: "",
      ktp_village: "",
      ...(f.same_as_ktp
        ? {
            domicile_city: name,
            domicile_district: "",
            domicile_village: "",
          }
        : {}),
    }));

    if (code) {
      setLoadingKtpDistricts(true);
      const distList = await getDistricts(code);
      setKtpDistricts(distList);
      setLoadingKtpDistricts(false);

      if (formData.same_as_ktp) {
        setDomicileRegencyCode(code);
        setDomicileDistricts(distList);
        setDomicileDistrictCode("");
        setDomicileVillages([]);
      }
    }
  };

  const handleKtpDistrictChange = async (e) => {
    const code = e.target.value;
    const selected = ktpDistricts.find((d) => d.code === code);
    const name = selected ? selected.name : "";

    setKtpDistrictCode(code);
    setKtpVillages([]);

    setFormData((f) => ({
      ...f,
      ktp_district: name,
      ktp_village: "",
      ...(f.same_as_ktp
        ? {
            domicile_district: name,
            domicile_village: "",
          }
        : {}),
    }));

    if (code) {
      setLoadingKtpVillages(true);
      const vilList = await getVillages(code);
      setKtpVillages(vilList);
      setLoadingKtpVillages(false);

      if (formData.same_as_ktp) {
        setDomicileDistrictCode(code);
        setDomicileVillages(vilList);
      }
    }
  };

  const handleKtpVillageChange = (e) => {
    const code = e.target.value;
    const selected = ktpVillages.find((v) => v.code === code);
    const name = selected ? selected.name : "";

    setFormData((f) => ({
      ...f,
      ktp_village: name,
      ...(f.same_as_ktp ? { domicile_village: name } : {}),
    }));
  };

  // Handler Pemilihan Wilayah Domisili (Open API wilayah.id)
  const handleDomicileProvinceChange = async (e) => {
    const code = e.target.value;
    const selected = provinces.find((p) => p.code === code);
    const name = selected ? selected.name : "";

    setDomicileProvinceCode(code);
    setDomicileRegencyCode("");
    setDomicileDistrictCode("");
    setDomicileRegencies([]);
    setDomicileDistricts([]);
    setDomicileVillages([]);

    setFormData((f) => ({
      ...f,
      domicile_province: name,
      domicile_city: "",
      domicile_district: "",
      domicile_village: "",
    }));

    if (code) {
      setLoadingDomicileRegencies(true);
      const regList = await getRegencies(code);
      setDomicileRegencies(regList);
      setLoadingDomicileRegencies(false);
    }
  };

  const handleDomicileCityChange = async (e) => {
    const code = e.target.value;
    const selected = domicileRegencies.find((r) => r.code === code);
    const name = selected ? selected.name : "";

    setDomicileRegencyCode(code);
    setDomicileDistrictCode("");
    setDomicileDistricts([]);
    setDomicileVillages([]);

    setFormData((f) => ({
      ...f,
      domicile_city: name,
      domicile_district: "",
      domicile_village: "",
    }));

    if (code) {
      setLoadingDomicileDistricts(true);
      const distList = await getDistricts(code);
      setDomicileDistricts(distList);
      setLoadingDomicileDistricts(false);
    }
  };

  const handleDomicileDistrictChange = async (e) => {
    const code = e.target.value;
    const selected = domicileDistricts.find((d) => d.code === code);
    const name = selected ? selected.name : "";

    setDomicileDistrictCode(code);
    setDomicileVillages([]);

    setFormData((f) => ({
      ...f,
      domicile_district: name,
      domicile_village: "",
    }));

    if (code) {
      setLoadingDomicileVillages(true);
      const vilList = await getVillages(code);
      setDomicileVillages(vilList);
      setLoadingDomicileVillages(false);
    }
  };

  const handleDomicileVillageChange = (e) => {
    const code = e.target.value;
    const selected = domicileVillages.find((v) => v.code === code);
    const name = selected ? selected.name : "";

    setFormData((f) => ({
      ...f,
      domicile_village: name,
    }));
  };

  // Handler Sama dengan KTP
  const handleSameAsKtpToggle = (checked) => {
    setFormData((prev) => ({
      ...prev,
      same_as_ktp: checked,
      domicile_address: checked ? prev.ktp_address : prev.domicile_address,
      domicile_province: checked ? prev.ktp_province : prev.domicile_province,
      domicile_city: checked ? prev.ktp_city : prev.domicile_city,
      domicile_district: checked ? prev.ktp_district : prev.domicile_district,
      domicile_village: checked ? prev.ktp_village : prev.domicile_village,
    }));

    if (checked) {
      setDomicileProvinceCode(ktpProvinceCode);
      setDomicileRegencies(ktpRegencies);
      setDomicileRegencyCode(ktpRegencyCode);
      setDomicileDistricts(ktpDistricts);
      setDomicileDistrictCode(ktpDistrictCode);
      setDomicileVillages(ktpVillages);
    }
  };

  // Handler Simpan Data Nasabah
  const handleSaveNasabah = (e) => {
    e.preventDefault();
    if (!selfieFile && !selfiePreview) {
      return toast.error("Silakan upload Foto Selfie terlebih dahulu");
    }
    if (!ktpFile && !ktpPreview) {
      return toast.error("Silakan upload Foto KTP Depan terlebih dahulu");
    }
    if (!ktpBackFile && !ktpBackPreview) {
      return toast.error("Silakan upload Foto KTP Belakang terlebih dahulu");
    }
    if (!formData.nik || formData.nik.length < 16) {
      return toast.error("NIK KTP harus 16 digit angka");
    }
    if (!formData.fullName.trim()) {
      return toast.error("Nama lengkap sesuai KTP harus diisi");
    }
    if (!formData.birth_date) {
      return toast.error("Tanggal lahir harus diisi");
    }
    if (!formData.ktp_address.trim()) {
      return toast.error("Alamat sesuai KTP harus diisi");
    }

    setNasabahComplete(true);
    setStage("lengkapi_data");
    toast.success("Data Nasabah berhasil disimpan!");
  };

  const handleSaveTambahan = (e) => {
    e?.preventDefault();
    if (!kkFile && !kkPreview) {
      return toast.error("Upload minimal Kartu Keluarga terlebih dahulu");
    }
    setTambahanComplete(true);
    setStage("lengkapi_data");
    toast.success("Data Tambahan berhasil disimpan!");
  };

  const handleSavePekerjaan = (e) => {
    e.preventDefault();
    if (!formData.company_name.trim()) {
      return toast.error("Nama kantor / tempat usaha harus diisi");
    }
    setPekerjaanComplete(true);
    setOpenPekerjaanModal(false);
    toast.success("Data Pekerjaan berhasil disimpan!");
  };

  const handleSubmitApplication = async () => {
    if (progress < 100) {
      return toast.error("Lengkapi semua data hingga 100% sebelum mengirim.");
    }

    setSubmitting(true);
    const toastId = toast.loading("Mengunggah data pengajuan...");

    try {
      // Pastikan semua dokumen terkompresi sebelum dikirim ke server
      const [
        cKtp, cKtpBack, cSelfie,
        cKk, cSlip, cNpwp, cBpjs, cIjazah, cPassport
      ] = await Promise.all([
        ktpFile ? compressImage(ktpFile) : null,
        ktpBackFile ? compressImage(ktpBackFile) : null,
        selfieFile ? compressImage(selfieFile) : null,
        kkFile ? compressImage(kkFile) : null,
        slipGajiFile ? compressImage(slipGajiFile) : null,
        npwpFile ? compressImage(npwpFile) : null,
        bpjsFile ? compressImage(bpjsFile) : null,
        ijazahFile ? compressImage(ijazahFile) : null,
        passportFile ? compressImage(passportFile) : null,
      ]);

      const form = new FormData();
      form.append("requested_amount", requestedAmount);
      form.append("requested_tenor", requestedTenor);
      form.append("monthly_installment", monthlyInstallment);
      form.append("nik", formData.nik);
      form.append("full_name", formData.fullName);
      form.append("birth_place", formData.birth_place);
      form.append("birth_date", formData.birth_date);
      form.append("mother_name", formData.mother_name || "-");

      form.append("ktp_address", formData.ktp_address);
      form.append("ktp_province", formData.ktp_province);
      form.append("ktp_city", formData.ktp_city);
      form.append("ktp_district", formData.ktp_district);
      form.append("ktp_village", formData.ktp_village);

      form.append("domicile_address", formData.domicile_address);
      form.append("domicile_province", formData.domicile_province);
      form.append("domicile_city", formData.domicile_city);
      form.append("domicile_district", formData.domicile_district);
      form.append("domicile_village", formData.domicile_village);
      form.append("residence_years", formData.residence_years);

      form.append("emergency_name", formData.emergency_name);
      form.append("emergency_relation", formData.emergency_relation);
      form.append("emergency_phone", formData.emergency_phone);
      form.append("emergency_address", formData.emergency_address);

      form.append("job_type", formData.job_type);
      form.append("company_name", formData.company_name);
      form.append("monthly_income", formData.monthly_income);

      if (cKtp) form.append("ktp", cKtp);
      if (cKtpBack) form.append("ktp_back", cKtpBack);
      if (cSelfie) form.append("selfie", cSelfie);

      // Dokumen Pendukung (Data Tambahan)
      if (cKk) form.append("kk", cKk);
      if (cSlip) form.append("slip_gaji", cSlip);
      if (cNpwp) form.append("npwp", cNpwp);
      if (cBpjs) form.append("bpjs", cBpjs);
      if (cIjazah) form.append("ijazah", cIjazah);
      if (cPassport) form.append("passport", cPassport);

      const res = await upload(API_ENDPOINTS.PAYLATER.APPLY, form);
      toast.dismiss(toastId);
      toast.success(res.message || "Pengajuan Pinjaman berhasil dikirim!");
      setApplication(res.data);
      setStage("riwayat");
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err.message || "Gagal mengirim pengajuan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ── TAHAP 0: RIWAYAT PINJAMAN (TEMA UNGU KREDITPAY) ── */}
      {stage === "riwayat" && (
        <div className="flex flex-col min-h-screen bg-[#F8FAFC] pb-12">
          {/* Header Ungu Khas KreditPay dengan Tombol Kembali */}
          <header className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-indigo-900 px-5 pt-6 pb-12 text-white rounded-b-[2.5rem] shadow-xl">
            {/* Ambient Glow Latar Ungu */}
            <div className="pointer-events-none absolute -right-12 -top-12 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute left-10 -bottom-10 h-48 w-48 rounded-full bg-purple-500/20 blur-2xl" />

            <div className="relative z-10 max-w-md mx-auto">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => navigate("/app")}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-3.5 py-2 text-xs font-black text-white backdrop-blur-md hover:bg-white/25 transition active:scale-95 shadow-sm"
                >
                  <ArrowLeft className="h-4 w-4 stroke-[2.5]" />
                  <span>Kembali</span>
                </button>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-black tracking-wide text-white backdrop-blur-md">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  <span>KreditPay PayLater</span>
                </div>
              </div>

              <div className="mt-4 space-y-1">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Riwayat Pinjaman
                </h1>
                <p className="text-xs text-white/80 font-medium">
                  Pantau status dan informasi pengajuan fasilitas limit Anda
                </p>
              </div>
            </div>
          </header>

          <main className="px-5 -mt-6 space-y-4 max-w-md mx-auto w-full">
            {/* Kartu 1: Riwayat Pinjaman */}
            <div className="rounded-3xl bg-white p-5 sm:p-6 shadow-sm ring-1 ring-slate-100 space-y-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-slate-900 tracking-tight">Status Pengajuan Pinjaman</h2>
                {application?.status === "approved" ? (
                  <span className="rounded-full bg-emerald-50 border border-emerald-200/80 px-3 py-0.5 text-xs font-black text-emerald-700 shadow-2xs">
                    Diterima
                  </span>
                ) : application?.status === "rejected" ? (
                  <span className="rounded-full bg-rose-50 border border-rose-200/80 px-3 py-0.5 text-xs font-black text-rose-700 shadow-2xs">
                    Ditolak
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-50 border border-amber-200/80 px-3 py-0.5 text-xs font-black text-amber-800 shadow-2xs">
                    Menunggu Verifikasi
                  </span>
                )}
              </div>

              <div className="rounded-2xl bg-primary-50/40 border border-primary-100/80 p-4 sm:p-5 space-y-2.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nominal Pinjaman</span>

                <p className="text-2xl sm:text-3xl font-black text-primary-950 tracking-tight">
                  {formatRupiah(application?.requested_amount || requestedAmount)}
                </p>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-primary-100/60 font-medium">
                  <span>Tenor: <b className="text-slate-800 font-bold">{application?.requested_tenor || requestedTenor} Bulan</b></span>
                  <span>Diajukan {formatDiajukanDate(application?.created_at) || "07-11-2026 19:40"}</span>
                </div>
              </div>
            </div>

            {/* Kartu 2: Status Verifikasi (Tombol Surat Persetujuan Di-Hide Sesuai Request) */}
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 text-center space-y-4">
              {application?.status === "approved" ? (
                <>
                  {/* Badge Bulat Oranye Centang VERIFIED */}
                  <div className="flex items-center justify-center pt-1">
                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/80 bg-gradient-to-r from-amber-50 via-white to-amber-50 px-3.5 py-1.5 shadow-xs">
                      <div className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-white shadow-xs">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                      <span className="text-xs font-black tracking-wider text-slate-900 uppercase">
                        VERIFIED
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-900">Pinjaman Anda Telah Disetujui!</h3>
                    <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                      Pengajuan pinjaman Anda telah berhasil disetujui &amp; limit PayLater aktif. Anda kini dapat menggunakan limit untuk berbagai layanan di aplikasi.
                    </p>
                  </div>

                  {/* Tombol kembali ke Beranda (Warna Ungu Khas KreditPay) */}
                  <button
                    type="button"
                    onClick={() => navigate("/app")}
                    className="w-full rounded-2xl bg-primary-700 py-3.5 text-sm font-black text-white shadow-lg shadow-primary-700/25 hover:bg-primary-800 transition active:scale-[0.99]"
                  >
                    Kembali ke Beranda
                  </button>
                </>
              ) : application?.status === "rejected" ? (
                <>
                  <div className="flex items-center justify-center pt-1">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-rose-50 text-rose-600">
                      <X className="h-6 w-6 stroke-[2.5]" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-800">Pengajuan Belum Disetujui</h3>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                      Mohon maaf, pengajuan pinjaman Anda belum dapat disetujui saat ini. Silakan periksa kembali data berkas atau hubungi tim bantuan kami.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStage("simulasi")}
                    className="w-full rounded-2xl bg-slate-900 py-3.5 text-xs font-bold text-white hover:bg-slate-800 transition active:scale-[0.99]"
                  >
                    Ajukan Ulang Pinjaman
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center pt-1">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-amber-50 text-amber-600">
                      <Clock className="h-6 w-6 animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-800">Sedang Diverifikasi Tim Analis</h3>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                      Pengajuan pinjaman Anda telah kami terima dan sedang diverifikasi oleh analis (1x24 jam). Hasilnya akan kami kirimkan melalui notifikasi akun.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStage("lengkapi_data")}
                    className="w-full rounded-2xl bg-slate-100 py-3.5 text-xs font-black text-slate-700 hover:bg-slate-200 transition active:scale-[0.99]"
                  >
                    Lihat Berkas yang Diajukan
                  </button>
                </>
              )}
            </div>

            {/* Opsi Cek Berkas jika status disetujui */}
            {application?.status === "approved" && (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setStage("lengkapi_data")}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 underline"
                >
                  Lihat Berkas &amp; Formulir Pengajuan
                </button>
              </div>
            )}
          </main>
        </div>
      )}

      {/* ── TAHAP 1: AKTIVASI PAYLATER (GAMBAR 1) ── */}
      {stage === "aktivasi" && (
        <div className="flex flex-col min-h-screen justify-between p-6">
          <div>
            {/* Top Bar Navigasi */}
            <div className="flex items-center gap-4 py-2">
              <button
                type="button"
                onClick={() => navigate("/app")}
                className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-50 text-slate-700 hover:bg-slate-100 transition"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-black text-slate-900">Aktivasi Pinjaman</h1>
            </div>

            {/* Ilustrasi Laptop 3D & Kopi */}
            <div className="my-4 flex justify-center">
              <svg viewBox="0 0 320 220" className="mx-auto h-48 w-full max-w-[280px] drop-shadow-lg" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="laptopGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#7C3AED" />
                    <stop offset="100%" stopColor="#4C1D95" />
                  </linearGradient>
                  <linearGradient id="screenGlow" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#A855F7" />
                    <stop offset="100%" stopColor="#6366F1" />
                  </linearGradient>
                </defs>

                <ellipse cx="160" cy="175" rx="85" ry="25" fill="#E2E8F0" opacity="0.6" />

                <g transform="translate(65, 85)">
                  <ellipse cx="28" cy="48" rx="20" ry="10" fill="#E2E8F0" />
                  <ellipse cx="28" cy="46" rx="16" ry="7" fill="#CBD5E1" />
                  <path d="M16 22 L20 44 C20 46 36 46 36 44 L40 22 Z" fill="#6B21A8" />
                  <ellipse cx="28" cy="22" rx="12" ry="5" fill="#7C3AED" />
                  <ellipse cx="28" cy="21" rx="10" ry="4" fill="#581C87" />
                  <circle cx="28" cy="32" r="3" fill="#FDE047" />
                </g>

                <g transform="translate(100, 40)">
                  <path d="M-15 110 L80 155 L160 115 L65 75 Z" fill="#4C1D95" />
                  <path d="M-15 110 L80 155 L80 162 L-15 117 Z" fill="#3B0764" />
                  <path d="M160 115 L80 155 L80 162 L160 122 Z" fill="#2E1065" />

                  <path d="M5 106 L75 138 L135 110 L70 82 Z" fill="#581C87" />
                  <path d="M20 102 L85 132 M35 96 L100 126 M50 90 L115 120" stroke="#7E22CE" strokeWidth="2" />
                  <path d="M45 132 L68 143 L85 134 L62 124 Z" fill="#7C3AED" />

                  <path d="M65 75 L160 115 L145 25 L50 -12 Z" fill="#1E1B4B" />
                  <path d="M62 72 L155 110 L142 28 L51 -7 Z" fill="url(#screenGlow)" />
                  <path d="M65 10 L130 40 L100 65 L55 20 Z" fill="#FFFFFF" opacity="0.15" />
                </g>
              </svg>
            </div>

            {/* Judul & Penjelasan */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black text-slate-900">Pengajuan Mudah</h2>
              <p className="mx-auto max-w-xs text-sm font-semibold text-slate-500 leading-relaxed">
                Nikmati limit Pinjaman hingga <b className="text-primary-700">Rp 500.000.000</b> dengan proses kilat tanpa ribet.
              </p>
            </div>

            {/* Kotak Syarat Pengajuan (3 Langkah) */}
            <div className="mt-6 rounded-3xl border border-slate-100 bg-[#F8FAFC] p-5 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-4">
                SYARAT PENGAJUAN (3 LANGKAH)
              </h3>

              <div className="space-y-4">
                {/* Langkah 1 */}
                <div className="flex items-start gap-3.5 relative">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-teal-50 text-teal-600 shrink-0">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">1. Upload Foto KTP</h4>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      Pastikan foto KTP terlihat jelas, tidak buram, dan data terbaca.
                    </p>
                  </div>
                </div>

                {/* Garis putus-putus */}
                <div className="ml-5 h-4 w-0 border-l-2 border-dashed border-slate-200" />

                {/* Langkah 2 */}
                <div className="flex items-start gap-3.5 relative">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-purple-50 text-primary-700 shrink-0">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                      <circle cx="12" cy="11" r="3" />
                      <path d="M8 17a4 4 0 0 1 8 0" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">2. Foto Selfie</h4>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      Lakukan verifikasi wajah (Liveness Detection) untuk keamanan akun.
                    </p>
                  </div>
                </div>

                {/* Garis putus-putus */}
                <div className="ml-5 h-4 w-0 border-l-2 border-dashed border-slate-200" />

                {/* Langkah 3 */}
                <div className="flex items-start gap-3.5 relative">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-500 shrink-0">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">3. Lengkapi Data</h4>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      Isi formulir data diri singkat dan pekerjaan untuk menentukan limit kredit.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tombol Aktivasi Pinjaman (Toska) */}
          <button
            type="button"
            onClick={() => setStage("simulasi")}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00D1B2] py-4 text-base font-black text-white shadow-lg shadow-[#00D1B2]/30 transition hover:bg-[#00c4a7] active:scale-[0.98]"
          >
            Aktivasi Pinjaman
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* ── TAHAP 1.5: SIMULASI PINJAMAN (MODEL SLIDER INTERAKTIF SESUAI GAMBAR USER) ── */}
      {stage === "simulasi" && (
        <div className="flex flex-col min-h-screen bg-slate-50 pb-12">
          {/* Top Hero Banner dengan Latar Gradien & Ambient Glow */}
          <header className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-indigo-900 px-5 pt-6 pb-20 text-white rounded-b-[2.5rem] shadow-xl">
            {/* Latar Grafis & Glow Ambient */}
            <div className="pointer-events-none absolute -right-12 -top-12 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute left-10 -bottom-10 h-48 w-48 rounded-full bg-teal-400/20 blur-2xl" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStage("aktivasi")}
                  className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 backdrop-blur-md text-white hover:bg-white/25 transition active:scale-95 shadow-sm"
                  aria-label="Kembali"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1 text-xs font-black tracking-wide text-white backdrop-blur-md">
                  <Sparkles className="h-3.5 w-3.5 text-teal-300" />
                  <span>KreditPay Pinjaman</span>
                </div>
              </div>

              <div className="mt-5 space-y-1.5">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Simulasi Pinjaman
                </h1>
                <p className="text-xs sm:text-sm font-medium text-white/80 leading-relaxed max-w-sm">
                  Geser tombol di bawah untuk menentukan jumlah pinjaman dan jangka waktu tenor.
                </p>
              </div>

              {/* Mini Badge Info di Banner */}
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold text-white/90">
                <span className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 backdrop-blur-xs">
                  <Zap className="h-3.5 w-3.5 text-amber-300" /> Pencairan Kilat
                </span>
                <span className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 backdrop-blur-xs">
                  <ShieldCheck className="h-3.5 w-3.5 text-teal-300" /> Bunga 0.16% / bln
                </span>
                <span className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 backdrop-blur-xs">
                  <Check className="h-3.5 w-3.5 text-emerald-300" /> Tanpa Agunan
                </span>
              </div>
            </div>
          </header>

          {/* Floating Card: Model Slider Interaktif (Sesuai Referensi Pengguna) */}
          <div className="relative z-10 -mt-12 mx-4 sm:mx-6 space-y-5">
            <div className="rounded-3xl bg-white p-5 sm:p-6 shadow-xl shadow-slate-200/80 border border-slate-100 space-y-6">
              
              {/* SLIDER 1: JUMLAH PINJAMAN */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                    JUMLAH PINJAMAN
                  </span>
                  <span className="rounded-xl bg-primary-700 px-3.5 py-1 text-xs sm:text-sm font-black text-white shadow-xs">
                    {formatRupiah(requestedAmount)}
                  </span>
                </div>

                {/* Track Slider Pinjaman */}
                <div className="relative pt-2">
                  <input
                    type="range"
                    min={5000000}
                    max={500000000}
                    step={5000000}
                    value={requestedAmount}
                    onChange={(e) => setRequestedAmount(Number(e.target.value))}
                    style={{
                      background: `linear-gradient(to right, #4338CA ${Math.max(0, Math.min(100, ((requestedAmount - 5000000) / (500000000 - 5000000)) * 100))}%, #E2E8F0 ${Math.max(0, Math.min(100, ((requestedAmount - 5000000) / (500000000 - 5000000)) * 100))}%)`
                    }}
                    className="h-2.5 w-full cursor-pointer appearance-none rounded-full accent-primary-700 outline-none transition"
                  />
                  <div className="mt-2 flex justify-between text-xs font-bold text-slate-400">
                    <span>Rp 5 Juta</span>
                    <span>Rp 500 Juta</span>
                  </div>
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[20000000, 50000000, 100000000, 250000000, 500000000].map((amt) => {
                    const isSelected = requestedAmount === amt;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setRequestedAmount(amt)}
                        className={`rounded-full px-3 py-1 text-xs font-black transition active:scale-95 ${
                          isSelected
                            ? "bg-primary-700 text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {amt >= 1000000000 ? `${amt / 1000000000} Milyar` : `${amt / 1000000} Jt`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SLIDER 2: TENOR */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                    TENOR
                  </span>
                  <span className="rounded-xl bg-blue-600 px-3.5 py-1 text-xs sm:text-sm font-black text-white shadow-xs">
                    {requestedTenor} Bulan
                  </span>
                </div>

                {/* Track Slider Tenor */}
                <div className="relative pt-2">
                  <input
                    type="range"
                    min={0}
                    max={TENOR_VALUES.length - 1}
                    step={1}
                    value={TENOR_VALUES.indexOf(requestedTenor) >= 0 ? TENOR_VALUES.indexOf(requestedTenor) : 0}
                    onChange={(e) => setRequestedTenor(TENOR_VALUES[Number(e.target.value)])}
                    style={{
                      background: `linear-gradient(to right, #2563EB ${Math.max(0, Math.min(100, (Math.max(0, TENOR_VALUES.indexOf(requestedTenor)) / (TENOR_VALUES.length - 1)) * 100))}%, #E2E8F0 ${Math.max(0, Math.min(100, (Math.max(0, TENOR_VALUES.indexOf(requestedTenor)) / (TENOR_VALUES.length - 1)) * 100))}%)`
                    }}
                    className="h-2.5 w-full cursor-pointer appearance-none rounded-full accent-blue-600 outline-none transition"
                  />
                  <div className="mt-2 flex justify-between text-xs font-bold text-slate-400">
                    <span>12 Bulan</span>
                    <span>60 Bulan</span>
                  </div>
                </div>

                {/* Tenor Preset Buttons */}
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {TENOR_VALUES.map((t) => {
                    const isSelected = requestedTenor === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setRequestedTenor(t)}
                        className={`rounded-xl py-1.5 text-center text-xs font-black transition active:scale-95 ${
                          isSelected
                            ? "bg-blue-50 text-blue-700 ring-2 ring-blue-600"
                            : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        {t} Bln
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* DIVIDER IKON KALKULATOR (Sesuai Referensi Gambar) */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-xs text-slate-400">
                  <Calculator className="h-5 w-5 text-primary-600" />
                </div>
              </div>

              {/* TABEL RINCIAN HASIL SIMULASI (Sesuai Screenshot Referensi) */}
              <div className="divide-y divide-slate-100 text-sm font-semibold">
                <div className="flex items-center justify-between py-3.5">
                  <span className="text-slate-600">Tanggal Jatuh Tempo</span>
                  <span className="font-extrabold text-blue-700 text-base">
                    {getDueDate(requestedTenor)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3.5">
                  <span className="text-slate-600">Pembayaran Per Bulan</span>
                  <span className="font-black text-blue-700 text-xl">
                    {formatRupiah(monthlyInstallment)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3.5">
                  <span className="text-slate-600">Bunga</span>
                  <span className="font-extrabold text-blue-700 text-base">
                    {formatRupiah(totalInterest)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3.5">
                  <span className="text-slate-600">Jumlah Pembayaran</span>
                  <span className="font-black text-blue-700 text-xl">
                    {formatRupiah(totalPayment)}
                  </span>
                </div>
              </div>

              {/* Tombol Lanjut & Ketentuan */}
              <div className="space-y-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStage("lengkapi_data")}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-700 via-primary-600 to-indigo-600 hover:from-primary-800 hover:to-indigo-700 py-4 text-base font-black text-white shadow-xl shadow-primary-700/30 transition hover:shadow-2xl active:scale-[0.98]"
                >
                  <span>Lanjut Lengkapi Berkas</span>
                  <ArrowRight className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={() => setOpenSyaratModal(true)}
                  className="flex w-full items-center justify-center gap-1.5 py-2 text-xs font-bold text-slate-500 hover:text-primary-700 transition"
                >
                  <Info className="h-4 w-4" />
                  <span>Keterangan Persyaratan & Ketentuan Pinjaman</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAHAP 2: LENGKAPI DATA (GAMBAR 2) ── */}
      {stage === "lengkapi_data" && (
        <div className="flex flex-col min-h-screen justify-between p-6">
          <div className="space-y-4">
            {/* Top Bar Navigasi */}
            <div className="flex items-center gap-4 py-2">
              <button
                type="button"
                onClick={() => (application ? setStage("riwayat") : setStage("simulasi"))}
                className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-50 text-slate-700 hover:bg-slate-100 transition"
                aria-label="Kembali"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-black text-slate-900">Lengkapi Data</h1>
            </div>

            {/* Banner Ringkasan Simulasi Pinjaman Terpilih */}
            <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/50 p-4 shadow-sm flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#a07421] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                    Pinjaman Terpilih
                  </span>
                  <span className="text-xs font-bold text-slate-600">{requestedTenor} Bulan</span>
                </div>
                <p className="text-lg font-black text-slate-900">{formatRupiah(requestedAmount)}</p>
                <p className="text-xs font-semibold text-slate-500">
                  Estimasi: <b className="text-[#1e3a8a]">{formatRupiah(monthlyInstallment)}/bln</b> (Bunga 2% p.a.)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStage("simulasi")}
                className="rounded-2xl border border-amber-300 bg-white px-3.5 py-2 text-xs font-black text-amber-800 hover:bg-amber-100/70 shadow-xs transition"
              >
                Ubah
              </button>
            </div>

            {/* Kotak Status Pengajuan & Roket */}
            <div className="rounded-3xl border border-slate-100 bg-[#F8FAFC] p-5 shadow-sm space-y-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                STATUS PENGAJUAN
              </p>

              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900">Kelengkapan Data</h3>
                <span className="text-2xl font-black text-primary-700">
                  {progress}%
                </span>
              </div>

              {/* Progress Bar dengan Roket */}
              <div className="relative pt-2 pb-1">
                <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary-700 transition-all duration-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {/* Ikon Roket meluncur di atas track */}
                <div
                  className="absolute -top-1 transition-all duration-700 pointer-events-none text-xl select-none leading-none"
                  style={{
                    left: `${Math.min(100, Math.max(0, progress))}%`,
                    transform: `translateX(-${Math.min(100, Math.max(0, progress))}%)`,
                  }}
                >
                  🚀
                </div>
              </div>

              {/* Info Pill */}
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500 pt-1">
                <Info className="h-4 w-4 text-slate-400" />
                <span>Lengkapi hingga 100% untuk pencairan.</span>
              </div>
            </div>

            {/* 5 Kartu Bagian Pengajuan */}
            <div className="space-y-3">
              {/* 1. Data Nasabah */}
              <div
                onClick={() => !application && setStage("data_nasabah")}
                className={`rounded-2xl border p-4 flex items-center justify-between transition cursor-pointer ${
                  nasabahComplete
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-slate-100 bg-white hover:border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-purple-50 text-primary-700 shrink-0">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">Data Nasabah</h4>
                    <p className="text-xs font-semibold text-slate-400 mt-0.5">
                      Foto KTP (Depan &amp; Belakang), Selfie, Data Identitas
                    </p>
                  </div>
                </div>
                <div>
                  {nasabahComplete ? (
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-white font-black text-xs">
                      <Check className="h-4 w-4" />
                    </span>
                  ) : (
                    <span className="grid h-7 w-7 place-items-center rounded-full text-red-500 font-black text-lg">
                      <X className="h-6 w-6 stroke-[3]" />
                    </span>
                  )}
                </div>
              </div>

              {/* 2. Data Pekerjaan */}
              <div
                onClick={() => !application && setOpenPekerjaanModal(true)}
                className={`rounded-2xl border p-4 flex items-center justify-between transition cursor-pointer ${
                  pekerjaanComplete
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-slate-100 bg-white hover:border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-600 shrink-0">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">Data Pekerjaan</h4>
                    <p className="text-xs font-semibold text-slate-400 mt-0.5">
                      Profesi, Nama Kantor, Gaji
                    </p>
                  </div>
                </div>
                <div>
                  {pekerjaanComplete ? (
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-white font-black text-xs">
                      <Check className="h-4 w-4" />
                    </span>
                  ) : (
                    <span className="grid h-7 w-7 place-items-center rounded-full text-red-500 font-black text-lg">
                      <X className="h-6 w-6 stroke-[3]" />
                    </span>
                  )}
                </div>
              </div>

              {/* 3. Data Tambahan */}
              <div
                onClick={() => !application && setStage("data_tambahan")}
                className={`rounded-2xl border p-4 flex items-center justify-between transition cursor-pointer ${
                  tambahanComplete
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-slate-100 bg-white hover:border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 shrink-0">
                    <FolderPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">Data Tambahan</h4>
                    <p className="text-xs font-semibold text-slate-400 mt-0.5">
                      Dokumen Pendukung (KK, Slip Gaji, dll)
                    </p>
                  </div>
                </div>
                <div>
                  {tambahanComplete ? (
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-white font-black text-xs">
                      <Check className="h-4 w-4" />
                    </span>
                  ) : (
                    <span className="grid h-7 w-7 place-items-center rounded-full text-red-500 font-black text-lg">
                      <X className="h-6 w-6 stroke-[3]" />
                    </span>
                  )}
                </div>
              </div>

              {/* 4. Validasi dan Kirim */}
              <div
                className={`rounded-2xl border p-4 flex items-center justify-between transition ${
                  progress === 100 && !application
                    ? "border-primary-200 bg-primary-50/40"
                    : "border-slate-100 bg-white"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`grid h-11 w-11 place-items-center rounded-2xl shrink-0 ${
                    progress === 100 ? "bg-primary-100 text-primary-700" : "bg-slate-100 text-slate-400"
                  }`}>
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">Validasi dan Kirim</h4>
                    <p className="text-xs font-semibold text-slate-400 mt-0.5">
                      {progress === 100
                        ? "Data lengkap, siap diajukan"
                        : "Lengkapi data sebelumnya"}
                    </p>
                  </div>
                </div>
                <div>
                  {application ? (
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-white font-black text-xs">
                      <Check className="h-4 w-4" />
                    </span>
                  ) : progress === 100 ? (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        setAgreedChecked(false);
                        setOpenPersetujuanModal(true);
                      }}
                      className="rounded-full bg-primary-700 px-3.5 py-1.5 text-xs font-black text-white hover:bg-primary-800 transition active:scale-95"
                    >
                      {submitting ? "Kirim..." : "Kirim"}
                    </button>
                  ) : (
                    <span className="text-slate-300">
                      <Lock className="h-5 w-5" />
                    </span>
                  )}
                </div>
              </div>

              {/* 5. Proses Pencairan */}
              <div className="rounded-2xl border border-slate-100 bg-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className={`grid h-11 w-11 place-items-center rounded-2xl shrink-0 ${
                    application?.status === "approved"
                      ? "bg-emerald-100 text-emerald-700"
                      : application?.status === "pending"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-400"
                  }`}>
                    <Banknote className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">Proses Pencairan</h4>
                    <p className="text-xs font-semibold text-slate-400 mt-0.5">
                      {application?.status === "approved"
                        ? `Pinjaman Aktif (Limit ${formatRupiah(application?.requested_amount || 500000000)})`
                        : application?.status === "pending"
                        ? "Sedang diverifikasi tim analis (1x24 jam)"
                        : "Menunggu persetujuan admin"}
                    </p>
                  </div>
                </div>
                <div>
                  {application?.status === "approved" ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  ) : application?.status === "pending" ? (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700">
                      Proses
                    </span>
                  ) : (
                    <span className="text-slate-300">
                      <Lock className="h-5 w-5" />
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* KARTU KONFIRMASI PERSETUJUAN NASABAH (Sebelum Di-ACC) */}
            {application?.status === "pending" && (
              <div className="mt-4 rounded-3xl border-2 border-primary-200 bg-gradient-to-br from-primary-50/70 via-white to-amber-50/40 p-5 shadow-sm space-y-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-700 text-white shrink-0 shadow-xs">
                    <ShieldCheck className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-primary-950">
                      KONFIRMASI PERSETUJUAN NASABAH
                    </h3>
                    <p className="text-[11px] font-bold text-primary-700">
                      Disini kami hanya meminta persetujuan anda terlebih dahulu
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs font-medium text-slate-700 leading-relaxed bg-white/90 p-4 rounded-2xl border border-primary-100 shadow-2xs">
                  <div className="flex items-start gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-700 mt-1.5 shrink-0" />
                    <p>Data sudah kami terima dan sudah diinput di sistem perusahaan.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-700 mt-1.5 shrink-0" />
                    <p>Pinjaman yang sudah di acc / Saldo yang akan muncul di aplikasi Kreditpay nantinya tidak bisa di batalkan dengan alasan apapun.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-700 mt-1.5 shrink-0" />
                    <p>Apabila nasabah telat melakukan pembayaran tagihan, akan kami berikan waktu tambahan 3 hari, dan apabila belum ada itikad baik/belum membayar juga maka akan dikenakan denda sesuai dengan ketentuan perusahaan, dan apabila mengalami tunggakan dalam 2 bulan maka BI Checking anda akan buruk di seluruh Bank di Indonesia.</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-bold pt-1">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400">Pernyataan Nasabah:</span>
                    <p className="text-emerald-700 font-black flex items-center gap-1">
                      <Check className="h-3.5 w-3.5 stroke-[3]" /> Telah Disetujui Nasabah
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400">Hormat Kami,</p>
                    <p className="text-xs font-black text-primary-900 tracking-wider">KREDITPAY</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tombol kembali ke Beranda / Riwayat */}
          <div className="mt-6 space-y-2">
            {application && (
              <button
                type="button"
                onClick={() => setStage("riwayat")}
                className="w-full rounded-2xl bg-primary-700 py-3.5 text-sm font-black text-white hover:bg-primary-800 transition active:scale-[0.99] shadow-sm"
              >
                Kembali ke Riwayat Pinjaman
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate("/app")}
              className="w-full rounded-2xl bg-slate-100 py-3.5 text-sm font-black text-slate-600 hover:bg-slate-200 transition"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      )}

      {/* ── TAHAP 3: LENGKAPI DATA NASABAH (GAMBAR USER) ── */}
      {stage === "data_nasabah" && (
        <div className="flex flex-col min-h-screen bg-[#F8FAFC]">
          {/* Header Sticky */}
          <header className="sticky top-0 z-20 flex items-center gap-3 bg-white px-5 py-4 shadow-sm border-b border-slate-100">
            <button
              type="button"
              onClick={() => setStage("lengkapi_data")}
              className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-50 text-slate-700 hover:bg-slate-100 transition"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-black text-slate-900">Lengkapi Data Nasabah</h1>
          </header>

          {/* Form Body */}
          <form onSubmit={handleSaveNasabah} className="p-4 sm:p-5 space-y-4 pb-28">
            {/* 1. Foto Dokumen */}
            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 border border-slate-100 space-y-3">
              <h2 className="text-base font-black text-primary-900">1. Foto Dokumen</h2>
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                {/* Foto Selfie */}
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5 text-center truncate">
                    FOTO SELFIE
                  </label>
                  <input
                    type="file"
                    ref={selfieInputRef}
                    onChange={handleSelfieChange}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />
                  {selfiePreview ? (
                    <div
                      onClick={() => selfieInputRef.current?.click()}
                      className="relative aspect-square w-full rounded-2xl overflow-hidden border-2 border-emerald-400 cursor-pointer shadow-sm group"
                    >
                      <img src={selfiePreview} alt="Selfie" className="h-full w-full object-cover" />
                      <span className="absolute top-1.5 right-1.5 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white text-[10px]">
                        <Check className="h-3 w-3" />
                      </span>
                      <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-[9px] font-black text-white text-center">
                        Ganti
                      </span>
                    </div>
                  ) : (
                    <div
                      onClick={() => selfieInputRef.current?.click()}
                      className="aspect-square w-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-2 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-primary-50/30 hover:border-primary-400 transition"
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-purple-50 text-primary-700">
                        <Camera className="h-5 w-5" />
                      </span>
                      <span className="text-[10px] sm:text-xs font-black text-slate-600 text-center leading-tight">
                        Ambil Selfie
                      </span>
                    </div>
                  )}
                </div>

                {/* Foto KTP Depan */}
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5 text-center truncate">
                    FOTO KTP DEPAN
                  </label>
                  <input
                    type="file"
                    ref={ktpInputRef}
                    onChange={handleKtpChange}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />
                  {ktpPreview ? (
                    <div
                      onClick={() => ktpInputRef.current?.click()}
                      className="relative aspect-square w-full rounded-2xl overflow-hidden border-2 border-emerald-400 cursor-pointer shadow-sm group"
                    >
                      <img src={ktpPreview} alt="KTP Depan" className="h-full w-full object-cover" />
                      <span className="absolute top-1.5 right-1.5 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white text-[10px]">
                        <Check className="h-3 w-3" />
                      </span>
                      <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-[9px] font-black text-white text-center">
                        Ganti
                      </span>
                    </div>
                  ) : (
                    <div
                      onClick={() => ktpInputRef.current?.click()}
                      className="aspect-square w-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-2 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-primary-50/30 hover:border-primary-400 transition"
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-600">
                        <CreditCard className="h-5 w-5" />
                      </span>
                      <span className="text-[10px] sm:text-xs font-black text-slate-600 text-center leading-tight">
                        Scan KTP
                      </span>
                    </div>
                  )}
                </div>

                {/* Foto KTP Belakang */}
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5 text-center truncate">
                    KTP BELAKANG
                  </label>
                  <input
                    type="file"
                    ref={ktpBackInputRef}
                    onChange={handleKtpBackChange}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />
                  {ktpBackPreview ? (
                    <div
                      onClick={() => ktpBackInputRef.current?.click()}
                      className="relative aspect-square w-full rounded-2xl overflow-hidden border-2 border-emerald-400 cursor-pointer shadow-sm group"
                    >
                      <img src={ktpBackPreview} alt="KTP Belakang" className="h-full w-full object-cover" />
                      <span className="absolute top-1.5 right-1.5 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white text-[10px]">
                        <Check className="h-3 w-3" />
                      </span>
                      <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-[9px] font-black text-white text-center">
                        Ganti
                      </span>
                    </div>
                  ) : (
                    <div
                      onClick={() => ktpBackInputRef.current?.click()}
                      className="aspect-square w-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-2 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-primary-50/30 hover:border-primary-400 transition"
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                        <CreditCard className="h-5 w-5" />
                      </span>
                      <span className="text-[10px] sm:text-xs font-black text-slate-600 text-center leading-tight">
                        KTP Belakang
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* 2. Data Identitas */}
            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 border border-slate-100 space-y-3">
              <h2 className="text-base font-black text-primary-900">2. Data Identitas</h2>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">NIK KTP</label>
                <input
                  type="text"
                  value={formData.nik}
                  onChange={(e) => setFormData((f) => ({ ...f, nik: digitsOnly(e.target.value).slice(0, 16) }))}
                  placeholder="Masukkan 16 digit NIK"
                  className="w-full rounded-2xl border border-slate-100 bg-[#F8FAFC] p-3.5 text-sm font-semibold text-slate-800 focus:border-primary-500 focus:bg-white focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="Nama lengkap sesuai KTP"
                  className="w-full rounded-2xl border border-slate-100 bg-[#F8FAFC] p-3.5 text-sm font-semibold text-slate-800 focus:border-primary-500 focus:bg-white focus:outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Tempat Lahir</label>
                  <input
                    type="text"
                    value={formData.birth_place}
                    onChange={(e) => setFormData((f) => ({ ...f, birth_place: e.target.value }))}
                    placeholder="Tempat Lahir"
                    className="w-full rounded-2xl border border-slate-100 bg-[#F8FAFC] p-3.5 text-sm font-semibold text-slate-800 focus:border-primary-500 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData((f) => ({ ...f, birth_date: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-100 bg-[#F8FAFC] p-3.5 text-sm font-semibold text-slate-800 focus:border-primary-500 focus:bg-white focus:outline-none"
                    required
                  />
                </div>
              </div>
            </section>

            {/* 3. Alamat Sesuai KTP */}
            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 border border-slate-100 space-y-3">
              <h2 className="text-base font-black text-primary-900">3. Alamat Sesuai KTP</h2>
              <div>
                <textarea
                  rows={2}
                  value={formData.ktp_address}
                  onChange={(e) => setFormData((f) => ({ ...f, ktp_address: e.target.value }))}
                  placeholder="Alamat jalan, RT/RW, no. rumah sesuai KTP"
                  className="w-full rounded-2xl border border-slate-100 bg-[#F8FAFC] p-3.5 text-sm font-semibold text-slate-800 focus:border-primary-500 focus:bg-white focus:outline-none"
                  required
                />
              </div>
              {/* Dropdown Provinsi KTP */}
              <div className="relative">
                <select
                  value={ktpProvinceCode}
                  onChange={handleKtpProvinceChange}
                  disabled={loadingProvinces}
                  className="w-full appearance-none rounded-2xl border border-slate-100 bg-[#F8FAFC] py-3.5 pl-4 pr-10 text-sm font-semibold text-slate-800 focus:border-primary-500 focus:bg-white focus:outline-none cursor-pointer disabled:opacity-60"
                  required
                >
                  <option value="">{loadingProvinces ? "Memuat Provinsi..." : "Pilih Provinsi"}</option>
                  {provinces.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>

              {/* Dropdown Kota/Kabupaten KTP */}
              <div className="relative">
                <select
                  value={ktpRegencyCode}
                  onChange={handleKtpCityChange}
                  disabled={!ktpProvinceCode || loadingKtpRegencies}
                  className="w-full appearance-none rounded-2xl border border-slate-100 bg-[#F8FAFC] py-3.5 pl-4 pr-10 text-sm font-semibold text-slate-800 focus:border-primary-500 focus:bg-white focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  required
                >
                  <option value="">
                    {loadingKtpRegencies
                      ? "Memuat Kota/Kabupaten..."
                      : !ktpProvinceCode
                      ? "Pilih Provinsi terlebih dahulu"
                      : "Pilih Kota/Kabupaten"}
                  </option>
                  {ktpRegencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>

              {/* Dropdown Kecamatan KTP */}
              <div className="relative">
                <select
                  value={ktpDistrictCode}
                  onChange={handleKtpDistrictChange}
                  disabled={!ktpRegencyCode || loadingKtpDistricts}
                  className="w-full appearance-none rounded-2xl border border-slate-100 bg-[#F8FAFC] py-3.5 pl-4 pr-10 text-sm font-semibold text-slate-800 focus:border-primary-500 focus:bg-white focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {loadingKtpDistricts
                      ? "Memuat Kecamatan..."
                      : !ktpRegencyCode
                      ? "Pilih Kota/Kabupaten terlebih dahulu"
                      : "Pilih Kecamatan"}
                  </option>
                  {ktpDistricts.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>

              {/* Dropdown Kelurahan KTP */}
              <div className="relative">
                <select
                  value={
                    ktpVillages.find((v) => v.name === formData.ktp_village)?.code || ""
                  }
                  onChange={handleKtpVillageChange}
                  disabled={!ktpDistrictCode || loadingKtpVillages}
                  className="w-full appearance-none rounded-2xl border border-slate-100 bg-[#F8FAFC] py-3.5 pl-4 pr-10 text-sm font-semibold text-slate-800 focus:border-primary-500 focus:bg-white focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {loadingKtpVillages
                      ? "Memuat Kelurahan..."
                      : !ktpDistrictCode
                      ? "Pilih Kecamatan terlebih dahulu"
                      : "Pilih Kelurahan"}
                  </option>
                  {ktpVillages.map((v) => (
                    <option key={v.code} value={v.code}>
                      {v.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </section>

            {/* 4. Domisili Saat Ini */}
            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 border border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black text-primary-900">4. Domisili Saat Ini</h2>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.same_as_ktp}
                    onChange={(e) => handleSameAsKtpToggle(e.target.checked)}
                    className="rounded text-primary-700 focus:ring-primary-600"
                  />
                  Sama dengan KTP
                </label>
              </div>
              <div>
                <textarea
                  rows={2}
                  value={formData.domicile_address}
                  disabled={formData.same_as_ktp}
                  onChange={(e) => setFormData((f) => ({ ...f, domicile_address: e.target.value }))}
                  placeholder="Alamat Tinggal Sekarang"
                  className="w-full rounded-2xl border border-slate-100 bg-[#F8FAFC] p-3.5 text-sm font-semibold text-slate-800 focus:border-primary-500 focus:bg-white focus:outline-none disabled:opacity-60"
                />
              </div>

              {/* Dropdown Provinsi Domisili */}
              <div className="relative">
                <select
                  value={domicileProvinceCode}
                  onChange={handleDomicileProvinceChange}
                  disabled={formData.same_as_ktp || loadingProvinces}
                  className="w-full appearance-none rounded-2xl border border-slate-100 bg-[#F8FAFC] py-3.5 pl-4 pr-10 text-sm font-semibold text-slate-800 focus:border-primary-500 focus:bg-white focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">{loadingProvinces ? "Memuat Provinsi..." : "Pilih Provinsi"}</option>
                  {provinces.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>

              {/* Dropdown Kota/Kabupaten Domisili */}
              <div className="relative">
                <select
                  value={domicileRegencyCode}
                  onChange={handleDomicileCityChange}
                  disabled={formData.same_as_ktp || !domicileProvinceCode || loadingDomicileRegencies}
                  className="w-full appearance-none rounded-2xl border border-slate-100 bg-[#F8FAFC] py-3.5 pl-4 pr-10 text-sm font-semibold text-slate-800 focus:border-primary-500 focus:bg-white focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {loadingDomicileRegencies
                      ? "Memuat Kota/Kabupaten..."
                      : !domicileProvinceCode
                      ? "Pilih Provinsi terlebih dahulu"
                      : "Pilih Kota/Kabupaten"}
                  </option>
                  {domicileRegencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>

              {/* Dropdown Kecamatan Domisili */}
              <div className="relative">
                <select
                  value={domicileDistrictCode}
                  onChange={handleDomicileDistrictChange}
                  disabled={formData.same_as_ktp || !domicileRegencyCode || loadingDomicileDistricts}
                  className="w-full appearance-none rounded-2xl border border-slate-100 bg-[#F8FAFC] py-3.5 pl-4 pr-10 text-sm font-semibold text-slate-800 focus:border-primary-500 focus:bg-white focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {loadingDomicileDistricts
                      ? "Memuat Kecamatan..."
                      : !domicileRegencyCode
                      ? "Pilih Kota/Kabupaten terlebih dahulu"
                      : "Pilih Kecamatan"}
                  </option>
                  {domicileDistricts.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>

              {/* Dropdown Kelurahan Domisili */}
              <div className="relative">
                <select
                  value={
                    domicileVillages.find((v) => v.name === formData.domicile_village)?.code || ""
                  }
                  onChange={handleDomicileVillageChange}
                  disabled={formData.same_as_ktp || !domicileDistrictCode || loadingDomicileVillages}
                  className="w-full appearance-none rounded-2xl border border-slate-100 bg-[#F8FAFC] py-3.5 pl-4 pr-10 text-sm font-semibold text-slate-800 focus:border-primary-500 focus:bg-white focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {loadingDomicileVillages
                      ? "Memuat Kelurahan..."
                      : !domicileDistrictCode
                      ? "Pilih Kecamatan terlebih dahulu"
                      : "Pilih Kelurahan"}
                  </option>
                  {domicileVillages.map((v) => (
                    <option key={v.code} value={v.code}>
                      {v.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Lama Menempati (Tahun)</label>
                <input
                  type="text"
                  value={formData.residence_years}
                  disabled={formData.same_as_ktp}
                  onChange={(e) => setFormData((f) => ({ ...f, residence_years: digitsOnly(e.target.value) }))}
                  placeholder="Contoh: 2"
                  className="w-full rounded-2xl border border-slate-100 bg-[#F8FAFC] p-3.5 text-sm font-semibold text-slate-800 focus:border-primary-500 focus:bg-white focus:outline-none"
                />
              </div>
            </section>

            {/* 5. Kontak Kerabat */}
            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 border border-slate-100 space-y-3">
              <h2 className="text-base font-black text-primary-900">5. Kontak Kerabat</h2>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nama Kerabat</label>
                <input
                  type="text"
                  value={formData.emergency_name}
                  onChange={(e) => setFormData((f) => ({ ...f, emergency_name: e.target.value }))}
                  placeholder="Nama Kerabat"
                  className="w-full rounded-2xl border border-slate-100 bg-[#F8FAFC] p-3.5 text-sm font-semibold text-slate-800 focus:border-primary-500 focus:bg-white focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Hubungan</label>
                <select
                  value={formData.emergency_relation}
                  onChange={(e) => setFormData((f) => ({ ...f, emergency_relation: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-100 bg-[#F8FAFC] p-3.5 text-sm font-semibold text-slate-800 focus:border-primary-500 focus:bg-white focus:outline-none cursor-pointer"
                >
                  <option value="ORANG TUA">ORANG TUA</option>
                  <option value="PASANGAN / SUAMI / ISTRI">PASANGAN / SUAMI / ISTRI</option>
                  <option value="SAUDARA KANDUNG">SAUDARA KANDUNG</option>
                  <option value="ANAK">ANAK</option>
                  <option value="TEMAN / REKAN KERJA">TEMAN / REKAN KERJA</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">No HP Kerabat</label>
                <input
                  type="text"
                  value={formData.emergency_phone}
                  onChange={(e) => setFormData((f) => ({ ...f, emergency_phone: digitsOnly(e.target.value) }))}
                  placeholder="0812xxxx"
                  className="w-full rounded-2xl border border-slate-100 bg-[#F8FAFC] p-3.5 text-sm font-semibold text-slate-800 focus:border-primary-500 focus:bg-white focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Alamat Kerabat</label>
                <textarea
                  rows={2}
                  value={formData.emergency_address}
                  onChange={(e) => setFormData((f) => ({ ...f, emergency_address: e.target.value }))}
                  placeholder="Alamat Kerabat"
                  className="w-full rounded-2xl border border-slate-100 bg-[#F8FAFC] p-3.5 text-sm font-semibold text-slate-800 focus:border-primary-500 focus:bg-white focus:outline-none"
                />
              </div>
            </section>

            {/* Bottom Button Simpan & Lanjutkan */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full rounded-2xl bg-primary-700 py-4 text-base font-extrabold text-white shadow-lg shadow-primary-700/30 transition hover:bg-primary-800 active:scale-[0.98]"
              >
                Simpan &amp; Lanjutkan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── TAHAP 4: DATA TAMBAHAN / DOKUMEN PENDUKUNG (GAMBAR TERBARU) ── */}
      {stage === "data_tambahan" && (
        <div className="flex flex-col min-h-screen justify-between p-6 bg-slate-50/40">
          <div className="space-y-4">
            {/* Top Bar Navigasi */}
            <div className="flex items-center gap-4 py-2">
              <button
                type="button"
                onClick={() => setStage("lengkapi_data")}
                className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-700 shadow-sm hover:bg-slate-100 transition"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-black text-slate-900">Data Tambahan</h1>
            </div>

            {/* Kotak Dokumen Pendukung */}
            <div className="rounded-2xl border border-blue-100/90 bg-[#EFF6FF] p-4 flex items-start gap-3 shadow-xs">
              <div className="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-white shrink-0 mt-0.5">
                <Info className="h-3.5 w-3.5 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-black uppercase tracking-wider text-blue-900">
                  DOKUMEN PENDUKUNG
                </h3>
                <p className="text-xs font-medium text-blue-800/90 leading-relaxed">
                  Lengkapi dokumen di bawah ini untuk meningkatkan peluang persetujuan limit besar. Upload minimal <span className="font-extrabold text-blue-950">Kartu Keluarga</span>.
                </p>
              </div>
            </div>

            {/* Grid 6 Kartu Upload Dokumen */}
            <div className="grid grid-cols-2 gap-3.5">
              {/* 1. Kartu Keluarga */}
              <div className="rounded-3xl border border-slate-100 bg-white p-3.5 shadow-sm space-y-2">
                <h4 className="text-xs font-black text-slate-800 truncate">
                  Kartu Keluarga
                </h4>
                <input
                  type="file"
                  ref={kkInputRef}
                  onChange={(e) => handleDocFileChange(e, setKkFile, setKkPreview, "Kartu Keluarga")}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
                {kkPreview ? (
                  <div
                    onClick={() => kkInputRef.current?.click()}
                    className="relative aspect-square w-full rounded-2xl overflow-hidden border-2 border-emerald-400 cursor-pointer shadow-sm group"
                  >
                    <img src={resolveDocUrl(kkPreview)} alt="Kartu Keluarga" className="h-full w-full object-cover" />
                    <span className="absolute top-1.5 right-1.5 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white text-[10px]">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                    <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-[9px] font-black text-white text-center">
                      Ganti
                    </span>
                  </div>
                ) : (
                  <div
                    onClick={() => kkInputRef.current?.click()}
                    className="aspect-square w-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary-400 hover:bg-primary-50/20 transition"
                  >
                    <Users className="h-7 w-7 text-slate-300" />
                    <span className="text-[11px] font-bold text-slate-400">Upload</span>
                  </div>
                )}
              </div>

              {/* 2. Slip Gaji */}
              <div className="rounded-3xl border border-slate-100 bg-white p-3.5 shadow-sm space-y-2">
                <h4 className="text-xs font-black text-slate-800 truncate">
                  Slip Gaji
                </h4>
                <input
                  type="file"
                  ref={slipGajiInputRef}
                  onChange={(e) => handleDocFileChange(e, setSlipGajiFile, setSlipGajiPreview, "Slip Gaji")}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
                {slipGajiPreview ? (
                  <div
                    onClick={() => slipGajiInputRef.current?.click()}
                    className="relative aspect-square w-full rounded-2xl overflow-hidden border-2 border-emerald-400 cursor-pointer shadow-sm group"
                  >
                    <img src={resolveDocUrl(slipGajiPreview)} alt="Slip Gaji" className="h-full w-full object-cover" />
                    <span className="absolute top-1.5 right-1.5 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white text-[10px]">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                    <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-[9px] font-black text-white text-center">
                      Ganti
                    </span>
                  </div>
                ) : (
                  <div
                    onClick={() => slipGajiInputRef.current?.click()}
                    className="aspect-square w-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary-400 hover:bg-primary-50/20 transition"
                  >
                    <Receipt className="h-7 w-7 text-slate-300" />
                    <span className="text-[11px] font-bold text-slate-400">Upload</span>
                  </div>
                )}
              </div>

              {/* 3. NPWP */}
              <div className="rounded-3xl border border-slate-100 bg-white p-3.5 shadow-sm space-y-2">
                <h4 className="text-xs font-black text-slate-800 truncate">
                  NPWP
                </h4>
                <input
                  type="file"
                  ref={npwpInputRef}
                  onChange={(e) => handleDocFileChange(e, setNpwpFile, setNpwpPreview, "NPWP")}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
                {npwpPreview ? (
                  <div
                    onClick={() => npwpInputRef.current?.click()}
                    className="relative aspect-square w-full rounded-2xl overflow-hidden border-2 border-emerald-400 cursor-pointer shadow-sm group"
                  >
                    <img src={resolveDocUrl(npwpPreview)} alt="NPWP" className="h-full w-full object-cover" />
                    <span className="absolute top-1.5 right-1.5 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white text-[10px]">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                    <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-[9px] font-black text-white text-center">
                      Ganti
                    </span>
                  </div>
                ) : (
                  <div
                    onClick={() => npwpInputRef.current?.click()}
                    className="aspect-square w-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary-400 hover:bg-primary-50/20 transition"
                  >
                    <CreditCard className="h-7 w-7 text-primary-700" />
                    <span className="text-[11px] font-bold text-slate-400">Upload</span>
                  </div>
                )}
              </div>

              {/* 4. BPJS Ketenagakerjaan */}
              <div className="rounded-3xl border border-slate-100 bg-white p-3.5 shadow-sm space-y-2">
                <h4 className="text-xs font-black text-slate-800 truncate">
                  BPJS Ketenagakerja...
                </h4>
                <input
                  type="file"
                  ref={bpjsInputRef}
                  onChange={(e) => handleDocFileChange(e, setBpjsFile, setBpjsPreview, "BPJS Ketenagakerjaan")}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
                {bpjsPreview ? (
                  <div
                    onClick={() => bpjsInputRef.current?.click()}
                    className="relative aspect-square w-full rounded-2xl overflow-hidden border-2 border-emerald-400 cursor-pointer shadow-sm group"
                  >
                    <img src={resolveDocUrl(bpjsPreview)} alt="BPJS Ketenagakerjaan" className="h-full w-full object-cover" />
                    <span className="absolute top-1.5 right-1.5 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white text-[10px]">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                    <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-[9px] font-black text-white text-center">
                      Ganti
                    </span>
                  </div>
                ) : (
                  <div
                    onClick={() => bpjsInputRef.current?.click()}
                    className="aspect-square w-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary-400 hover:bg-primary-50/20 transition"
                  >
                    <BriefcaseMedical className="h-7 w-7 text-slate-300" />
                    <span className="text-[11px] font-bold text-slate-400">Upload</span>
                  </div>
                )}
              </div>

              {/* 5. Ijazah Terakhir */}
              <div className="rounded-3xl border border-slate-100 bg-white p-3.5 shadow-sm space-y-2">
                <h4 className="text-xs font-black text-slate-800 truncate">
                  Ijazah Terakhir
                </h4>
                <input
                  type="file"
                  ref={ijazahInputRef}
                  onChange={(e) => handleDocFileChange(e, setIjazahFile, setIjazahPreview, "Ijazah Terakhir")}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
                {ijazahPreview ? (
                  <div
                    onClick={() => ijazahInputRef.current?.click()}
                    className="relative aspect-square w-full rounded-2xl overflow-hidden border-2 border-emerald-400 cursor-pointer shadow-sm group"
                  >
                    <img src={resolveDocUrl(ijazahPreview)} alt="Ijazah Terakhir" className="h-full w-full object-cover" />
                    <span className="absolute top-1.5 right-1.5 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white text-[10px]">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                    <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-[9px] font-black text-white text-center">
                      Ganti
                    </span>
                  </div>
                ) : (
                  <div
                    onClick={() => ijazahInputRef.current?.click()}
                    className="aspect-square w-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary-400 hover:bg-primary-50/20 transition"
                  >
                    <GraduationCap className="h-7 w-7 text-slate-300" />
                    <span className="text-[11px] font-bold text-slate-400">Upload</span>
                  </div>
                )}
              </div>

              {/* 6. Passport (Opsional) */}
              <div className="rounded-3xl border border-slate-100 bg-white p-3.5 shadow-sm space-y-2">
                <h4 className="text-xs font-black text-slate-800 truncate">
                  Passport (Opsional)
                </h4>
                <input
                  type="file"
                  ref={passportInputRef}
                  onChange={(e) => handleDocFileChange(e, setPassportFile, setPassportPreview, "Passport")}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
                {passportPreview ? (
                  <div
                    onClick={() => passportInputRef.current?.click()}
                    className="relative aspect-square w-full rounded-2xl overflow-hidden border-2 border-emerald-400 cursor-pointer shadow-sm group"
                  >
                    <img src={resolveDocUrl(passportPreview)} alt="Passport" className="h-full w-full object-cover" />
                    <span className="absolute top-1.5 right-1.5 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white text-[10px]">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                    <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-[9px] font-black text-white text-center">
                      Ganti
                    </span>
                  </div>
                ) : (
                  <div
                    onClick={() => passportInputRef.current?.click()}
                    className="aspect-square w-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary-400 hover:bg-primary-50/20 transition"
                  >
                    <Globe className="h-7 w-7 text-slate-300" />
                    <span className="text-[11px] font-bold text-slate-400">Upload</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Button Kirim & Lanjutkan */}
          <div className="pt-4 pb-4">
            <button
              type="button"
              onClick={handleSaveTambahan}
              className="w-full rounded-2xl bg-primary-700 py-4 text-base font-extrabold text-white shadow-lg shadow-primary-700/30 transition hover:bg-primary-800 active:scale-[0.98]"
            >
              Kirim &amp; Lanjutkan
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL 2: FORM DATA PEKERJAAN ── */}
      <Modal
        open={openPekerjaanModal}
        onClose={() => setOpenPekerjaanModal(false)}
        title="Lengkapi Data Pekerjaan"
      >
        <form onSubmit={handleSavePekerjaan} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Profesi / Pekerjaan
            </label>
            <select
              className="w-full rounded-2xl border border-slate-200 p-3 text-xs sm:text-sm font-semibold text-slate-800 focus:border-primary-600 focus:outline-none"
              value={formData.job_type}
              onChange={(e) => setFormData((f) => ({ ...f, job_type: e.target.value }))}
            >
              <option value="Karyawan Swasta">Karyawan Swasta</option>
              <option value="Pegawai Negeri (PNS)">Pegawai Negeri (PNS)</option>
              <option value="Wiraswasta / Pemilik Usaha">Wiraswasta / Pemilik Usaha</option>
              <option value="Profesional / Freelancer">Profesional / Freelancer</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>

          <Input
            label="Nama Perusahaan / Kantor"
            value={formData.company_name}
            onChange={(e) => setFormData((f) => ({ ...f, company_name: e.target.value }))}
            placeholder="PT / CV / Toko"
            required
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Penghasilan Bulanan
            </label>
            <input
              type="text"
              className="w-full rounded-2xl border border-slate-200 p-3 text-xs sm:text-sm font-semibold text-slate-800 focus:border-primary-600 focus:outline-none"
              value={formData.monthly_income ? "Rp " + new Intl.NumberFormat("id-ID").format(Number(formData.monthly_income)) : ""}
              onChange={(e) => setFormData((f) => ({ ...f, monthly_income: digitsOnly(e.target.value) }))}
              placeholder="Rp 0"
              required
            />
          </div>

          <Input
            label="Lama Bekerja"
            value={formData.work_duration}
            onChange={(e) => setFormData((f) => ({ ...f, work_duration: e.target.value }))}
            placeholder="Contoh: 2 Tahun"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setOpenPekerjaanModal(false)}>
              Batal
            </Button>
            <Button type="submit">
              Simpan Pekerjaan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Keterangan Persyaratan Minimum */}
      <Modal
        open={openSyaratModal}
        onClose={() => setOpenSyaratModal(false)}
        title="Persyaratan Minimum Pinjaman"
      >
        <div className="space-y-4 text-xs font-medium text-slate-600">
          <p className="text-sm font-bold text-slate-800">
            Berikut adalah ketentuan dan kualifikasi minimum pengajuan Pinjaman KreditPay:
          </p>
          <ul className="space-y-2 list-disc pl-4 text-slate-700">
            <li>Warga Negara Indonesia (WNI) berusia minimal 21 tahun dan maksimal 60 tahun saat pelunasan.</li>
            <li>Memiliki e-KTP asli yang masih berlaku dan dapat difoto dengan jelas (depan dan belakang).</li>
            <li>Memiliki pekerjaan tetap, usaha mandiri, atau sumber penghasilan aktif.</li>
            <li>Melampirkan minimal 1 dokumen pendukung (Kartu Keluarga/Slip Gaji/NPWP/BPJS).</li>
            <li>Memiliki nomor HP aktif dan kontak darurat kerabat yang dapat dihubungi.</li>
            <li>
              <b>Bunga Ringan:</b> 2% flat per tahun (0.16% per bulan), tanpa biaya tersembunyi.
            </li>
            <li>
              <b>Biaya Administrasi:</b> Rp 0 (Bebas biaya admin pembukaan).
            </li>
            <li>Proses persetujuan limit kilat 1x24 jam kerja setelah formulir diverifikasi.</li>
          </ul>
          <div className="pt-2">
            <Button
              className="w-full bg-[#a07421] hover:bg-[#8e651a] text-white font-bold"
              onClick={() => setOpenSyaratModal(false)}
            >
              Saya Mengerti
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Konfirmasi Persetujuan Nasabah (Sebelum Pengajuan Dikirim) */}
      <Modal
        open={openPersetujuanModal}
        onClose={() => setOpenPersetujuanModal(false)}
        title="Kebijakan Layanan dan Privasi"
      >
        <div className="flex flex-col space-y-4">
          {/* Konten Ketentuan yang dapat di-scroll jika layar kecil */}
          <div className="max-h-[48vh] overflow-y-auto pr-1 space-y-3.5 text-xs font-medium text-slate-700">
            <div className="rounded-2xl bg-amber-50/80 border border-amber-200/80 p-3 text-center">
              <p className="font-extrabold text-amber-900 text-xs">
                Disini kami hanya meminta persetujuan anda terlebih dahulu
              </p>
            </div>

            <div className="space-y-3 rounded-2xl bg-slate-50 border border-slate-100 p-4 leading-relaxed">
              <div className="flex items-start gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-800 mt-2 shrink-0" />
                <p className="text-slate-700">
                  Data sudah kami terima dan sudah diinput di sistem perusahaan.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-800 mt-2 shrink-0" />
                <p className="text-slate-700">
                  Pinjaman yang sudah di acc / Saldo yang akan muncul di aplikasi Kreditpay nantinya tidak bisa di batalkan dengan alasan apapun.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-800 mt-2 shrink-0" />
                <p className="text-slate-700">
                  Apabila nasabah telat melakukan pembayaran tagihan, akan kami berikan waktu tambahan 3 hari, dan apabila belum ada itikad baik/belum membayar juga maka akan dikenakan denda sesuai dengan ketentuan perusahaan, dan apabila mengalami tunggakan dalam 2 bulan maka BI Checking anda akan buruk di seluruh Bank di Indonesia.
                </p>
              </div>
            </div>

            <div className="text-right pt-1 pr-1">
              <p className="text-[11px] text-slate-400">Hormat Kami,</p>
              <p className="text-xs font-black text-slate-900 tracking-wider">KREDITPAY</p>
            </div>
          </div>

          {/* Section Persetujuan & Konfirmasi (Sesuai Referensi Gambar) */}
          <div className="border-t border-slate-100 pt-3 space-y-3.5">
            <label className="flex items-start gap-3 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={agreedChecked}
                onChange={(e) => setAgreedChecked(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-all ${
                  agreedChecked
                    ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                    : "bg-white border-slate-300 text-transparent group-hover:border-slate-400"
                }`}
              >
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              </div>
              <span className="text-xs text-slate-600 leading-snug">
                Saya telah membaca dan menyetujui Informasi Ketentuan dan Kebijakan Privasi oleh <strong className="text-slate-900 font-bold">Kreditpay</strong>
              </span>
            </label>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                disabled={submitting || !agreedChecked}
                onClick={async () => {
                  setOpenPersetujuanModal(false);
                  await handleSubmitApplication();
                }}
                className="w-full rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-[0.99]"
              >
                {submitting ? "Memproses..." : "Konfirmasi"}
              </button>

              <button
                type="button"
                onClick={() => setOpenPersetujuanModal(false)}
                className="w-full py-1.5 text-center text-xs font-bold text-slate-400 hover:text-slate-600 transition"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── MODAL DETAIL PINJAMAN / SURAT PERSETUJUAN ── */}
      {openSuratModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setOpenSuratModal(false)}
        >
          <div
            className="relative flex flex-col w-full max-w-lg max-h-[92vh] rounded-3xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between bg-slate-900 px-5 py-3.5 text-white shrink-0">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-xl bg-blue-600 text-white shadow-xs">
                  <FileText className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-black tracking-tight text-white leading-tight">
                    Detail Pinjaman &amp; Surat Persetujuan
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Dokumen resmi persetujuan limit akun Anda
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpenSuratModal(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition active:scale-95"
                aria-label="Tutup"
              >
                <X className="h-4 w-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Switcher Tab Model Surat (Memungkinkan nasabah & admin mengganti model seketika) */}
            <div className="flex items-center justify-between gap-1.5 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs overflow-x-auto shrink-0">
              <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0 mr-1 hidden sm:inline">
                Pilihan Model:
              </span>
              <div className="flex items-center gap-1.5 w-full">
                {LETTER_MODELS.map((m) => {
                  const currentModel =
                    activeLetterModelTab || letterTemplate.letter_layout_model || "model_1";
                  const isCur = currentModel === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setActiveLetterModelTab(m.id)}
                      className={`flex-1 rounded-xl px-2 py-1 text-[10px] font-black tracking-tight transition truncate text-center ${
                        isCur
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-white text-slate-600 hover:bg-slate-200/60 border border-slate-200/80"
                      }`}
                    >
                      {m.id === "model_1" && "1. FinTech"}
                      {m.id === "model_2" && "2. Bank"}
                      {m.id === "model_3" && "3. SKPK"}
                      {m.id === "model_reference" && "4. Referensi"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Konten Kertas Dokumen Surat (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-100/50">
              <ApprovalLetterDocument
                model={activeLetterModelTab || letterTemplate.letter_layout_model || "model_1"}
                template={letterTemplate}
                application={application || {}}
                userInfo={userInfo || {}}
                appName="KreditPay"
                helpers={{
                  formatLetterNumber,
                  formatApplicationCode,
                  formatFormalDate,
                  formatFormalDateTime,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

