import { useState } from "react";
import toast from "react-hot-toast";
import { Check, CheckCheck, Eye, FileText, Search, X, Loader2 } from "lucide-react";
import useFetch from "@/hooks/useFetch";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Pagination from "@/components/ui/Pagination";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/StateViews";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { put, post } from "@/utils/request";
import { formatDateTime, formatRupiah, digitsOnly, fileUrl } from "@/utils/format";

export default function AdminPayLater() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const { data, loading, error, reload } = useFetch(
    `${API_ENDPOINTS.ADMIN.PAYLATER.LIST}?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&status=${status}`
  );

  const [selectedApp, setSelectedApp] = useState(null);
  const [approvedLimit, setApprovedLimit] = useState(50000000);
  const [processing, setProcessing] = useState(false);

  // Bulk Approval States
  const [selectedIds, setSelectedIds] = useState([]);
  const [openBulkModal, setOpenBulkModal] = useState(false);
  const [bulkMode, setBulkMode] = useState("all_pending"); // "all_pending" | "selected"
  const [bulkLimit, setBulkLimit] = useState(50000000);
  const [processingBulk, setProcessingBulk] = useState(false);

  const pendingOnPage = data?.data?.filter((item) => item.status === "pending") || [];
  const isAllPendingSelected =
    pendingOnPage.length > 0 &&
    pendingOnPage.every((item) => selectedIds.includes(item.id));

  const toggleSelectAll = () => {
    if (isAllPendingSelected) {
      const pendingIds = pendingOnPage.map((p) => p.id);
      setSelectedIds((prev) => prev.filter((id) => !pendingIds.includes(id)));
    } else {
      const newIds = pendingOnPage.map((p) => p.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...newIds])));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkApprove = async () => {
    setProcessingBulk(true);
    try {
      const payload = {
        all_pending: bulkMode === "all_pending",
        ids: bulkMode === "selected" ? selectedIds : undefined,
        default_limit: bulkLimit,
      };
      const res = await post(API_ENDPOINTS.ADMIN.PAYLATER.BULK_APPROVE, payload);
      toast.success(res.message || "Pengajuan PayLater berhasil disetujui sekaligus!");
      setOpenBulkModal(false);
      setSelectedIds([]);
      reload();
    } catch (err) {
      toast.error(err.message || "Gagal menyetujui pengajuan secara massal");
    } finally {
      setProcessingBulk(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Yakin ingin menolak ${selectedIds.length} pengajuan terpilih?`)) return;
    setProcessingBulk(true);
    try {
      const res = await post(API_ENDPOINTS.ADMIN.PAYLATER.BULK_REJECT, { ids: selectedIds });
      toast.success(res.message || "Pengajuan terpilih berhasil ditolak");
      setSelectedIds([]);
      reload();
    } catch (err) {
      toast.error(err.message || "Gagal menolak pengajuan");
    } finally {
      setProcessingBulk(false);
    }
  };

  const handleUpdateStatus = async (appId, newStatus) => {
    setProcessing(true);
    try {
      const res = await put(API_ENDPOINTS.ADMIN.PAYLATER.STATUS(appId), {
        status: newStatus,
        limit: approvedLimit,
      });
      toast.success(res.message || `Status pengajuan berhasil diubah ke ${newStatus}`);
      setSelectedApp(null);
      reload();
    } catch (err) {
      toast.error(err.message || "Gagal mengubah status pengajuan");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Pengajuan PayLater</h1>
          <p className="text-xs font-semibold text-slate-500">
            Kelola verifikasi berkas dan aktivasi limit PayLater pengguna.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="solid"
            icon={CheckCheck}
            onClick={() => {
              setBulkMode("all_pending");
              setOpenBulkModal(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md shadow-emerald-600/20"
          >
            ACC Semua Pending
          </Button>
        </div>
      </div>

      {/* Filter & Pencarian */}
      <div className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-primary-600 focus:bg-white focus:outline-none"
            placeholder="Cari berdasarkan nama, username, NIK, atau perusahaan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <select
            className="w-full sm:w-auto rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Semua Status</option>
            <option value="pending">Menunggu Verifikasi</option>
            <option value="approved">Disetujui</option>
            <option value="rejected">Ditolak</option>
          </select>

          <select
            className="w-full sm:w-auto rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            <option value={10}>10 / Hal</option>
            <option value={25}>25 / Hal</option>
            <option value={50}>50 / Hal</option>
          </select>
        </div>
      </div>

      {/* Daftar Pengajuan */}
      <div className="rounded-3xl bg-white p-4 sm:p-6 shadow-sm ring-1 ring-slate-100 space-y-4">
        {/* Banner Aksi Seleksi Massal */}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-600 text-white font-black text-[11px]">
                {selectedIds.length}
              </span>
              <span className="font-extrabold text-emerald-950">
                pengajuan dipilih
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="solid"
                icon={Check}
                onClick={() => {
                  setBulkMode("selected");
                  setOpenBulkModal(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                ACC Terpilih ({selectedIds.length})
              </Button>
              <Button
                size="sm"
                variant="soft"
                onClick={handleBulkReject}
                disabled={processingBulk}
                className="text-rose-700 hover:bg-rose-100 font-bold"
              >
                Tolak Terpilih
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds([])}
              >
                Batal
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <ListSkeleton rows={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !data?.data?.length ? (
          <EmptyState
            icon={FileText}
            title="Belum Ada Pengajuan"
            description="Belum ada pengguna yang mengajukan aktivasi PayLater."
          />
        ) : (
          <>
            {/* 1. Tampilan Mobile: Kartu Responsif (lg:hidden) */}
            <div className="lg:hidden space-y-3">
              {/* Bar Pilih Semua Pending di Mobile */}
              {pendingOnPage.length > 0 && (
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3.5 py-2.5 text-xs border border-slate-200/80">
                  <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAllPendingSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    />
                    <span>Pilih Semua Pending ({pendingOnPage.length})</span>
                  </label>
                  <span className="text-[11px] font-bold text-slate-400">
                    {selectedIds.length} dipilih
                  </span>
                </div>
              )}

              {data.data.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const isPending = item.status === "pending";

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-4 space-y-3.5 transition shadow-sm ${
                      isSelected
                        ? "border-emerald-300 bg-emerald-50/50"
                        : "border-slate-200/80 bg-white"
                    }`}
                  >
                    {/* Header Kartu: Checkbox, User Info & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(item.id)}
                          disabled={!isPending}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                        />
                        <div>
                          <p className="font-extrabold text-slate-900 text-sm leading-snug">
                            {item.user_name || item.username}
                          </p>
                          <p className="text-xs font-semibold text-slate-500">
                            @{item.username} · {item.user_phone || "-"}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${
                          item.status === "approved"
                            ? "bg-emerald-100 text-emerald-700"
                            : item.status === "rejected"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {item.status === "approved" && "Disetujui"}
                        {item.status === "rejected" && "Ditolak"}
                        {item.status === "pending" && "Menunggu"}
                      </span>
                    </div>

                    {/* Info Grid 2x2: NIK, Pekerjaan, Pinjaman Diajukan, Gaji Bulanan */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          NIK
                        </span>
                        <p className="font-mono font-bold text-slate-800 truncate mt-0.5" title={item.nik}>
                          {item.nik || "-"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Pekerjaan
                        </span>
                        <p className="font-bold text-slate-800 truncate mt-0.5" title={`${item.job_type || "-"} · ${item.company_name || "-"}`}>
                          {item.job_type || item.company_name || "-"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-amber-50/70 p-2.5 border border-amber-200/60">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                          Pinjaman Diajukan
                        </span>
                        <p className="font-black text-amber-900 mt-0.5">
                          {item.requested_amount > 0 ? formatRupiah(item.requested_amount) : "-"}
                        </p>
                        {item.requested_tenor > 0 && (
                          <span className="inline-block mt-0.5 text-[10px] font-bold text-amber-800 bg-amber-100/90 px-1.5 py-0.5 rounded">
                            {item.requested_tenor} Bulan
                          </span>
                        )}
                      </div>

                      <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Gaji Bulanan
                        </span>
                        <p className="font-black text-slate-800 mt-0.5">
                          {formatRupiah(item.monthly_income)}
                        </p>
                      </div>
                    </div>

                    {/* Footer Kartu: Tanggal Pengajuan & Tombol Verifikasi */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                      <p className="text-[11px] font-semibold text-slate-400">
                        {formatDateTime(item.created_at)}
                      </p>

                      <Button
                        size="sm"
                        variant="soft"
                        icon={Eye}
                        onClick={() => {
                          setSelectedApp(item);
                          setApprovedLimit(item.requested_amount > 0 ? Number(item.requested_amount) : 50000000);
                        }}
                        className="font-bold"
                      >
                        Detail Verifikasi
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 2. Tampilan Desktop / Layar Besar (hidden lg:block) */}
            <div className="hidden lg:block overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[980px] text-left text-sm whitespace-nowrap">
                <thead className="border-b border-slate-100 text-xs font-extrabold uppercase text-slate-400">
                  <tr>
                    <th className="pb-3 pl-2 w-10">
                      <input
                        type="checkbox"
                        checked={isAllPendingSelected}
                        onChange={toggleSelectAll}
                        disabled={pendingOnPage.length === 0}
                        className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer disabled:cursor-not-allowed"
                        title="Pilih semua pengajuan pending di halaman ini"
                      />
                    </th>
                    <th className="pb-3">Pengguna</th>
                    <th className="pb-3">NIK &amp; Pekerjaan</th>
                    <th className="pb-3">Pinjaman Diajukan</th>
                    <th className="pb-3">Gaji Bulanan</th>
                    <th className="pb-3">Tanggal Pengajuan</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right pr-2">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold">
                  {data.data.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/60 transition ${
                        selectedIds.includes(item.id) ? "bg-emerald-50/40" : ""
                      }`}
                    >
                      <td className="py-3.5 pl-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          disabled={item.status !== "pending"}
                          className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                        />
                      </td>
                      <td className="py-3.5">
                        <p className="font-extrabold text-slate-800">{item.user_name || item.username}</p>
                        <p className="text-xs text-slate-400">@{item.username} · {item.user_phone}</p>
                      </td>
                      <td className="py-3.5">
                        <p className="font-bold text-slate-800 font-mono text-xs">{item.nik}</p>
                        <p className="text-xs text-slate-500">{item.job_type} · {item.company_name}</p>
                      </td>
                      <td className="py-3.5">
                        <p className="font-extrabold text-amber-700 text-xs">
                          {item.requested_amount > 0 ? formatRupiah(item.requested_amount) : "-"}
                        </p>
                        {item.requested_tenor > 0 && (
                          <p className="text-[10px] text-slate-400 font-semibold">{item.requested_tenor} Bulan</p>
                        )}
                      </td>
                      <td className="py-3.5 text-xs font-black text-slate-700">
                        {formatRupiah(item.monthly_income)}
                      </td>
                      <td className="py-3.5 text-xs text-slate-500">
                        {formatDateTime(item.created_at)}
                      </td>
                      <td className="py-3.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${
                          item.status === "approved"
                            ? "bg-emerald-100 text-emerald-700"
                            : item.status === "rejected"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {item.status === "approved" && "Disetujui"}
                          {item.status === "rejected" && "Ditolak"}
                          {item.status === "pending" && "Menunggu"}
                        </span>
                      </td>
                      <td className="py-3.5 text-right pr-2">
                        <Button
                          size="sm"
                          variant="soft"
                          icon={Eye}
                          onClick={() => {
                            setSelectedApp(item);
                            setApprovedLimit(item.requested_amount > 0 ? Number(item.requested_amount) : 50000000);
                          }}
                        >
                          Detail
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Backend */}
            {data?.pagination && (
              <Pagination
                pagination={data.pagination}
                onPage={setPage}
                limit={limit}
                onLimit={setLimit}
              />
            )}
          </>
        )}
      </div>

      {/* Modal Detail & Persetujuan Pengajuan */}
      <Modal
        open={!!selectedApp}
        onClose={() => setSelectedApp(null)}
        title={`Verifikasi PayLater: ${selectedApp?.user_name || selectedApp?.username}`}
      >
        {selectedApp && (
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {/* Pilihan Simulasi Pinjaman */}
            {selectedApp.requested_amount > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-800">
                    Simulasi Pinjaman Terpilih
                  </h4>
                  <span className="rounded-full bg-amber-200/80 px-2.5 py-0.5 text-[10px] font-black text-amber-900">
                    Tenor {selectedApp.requested_tenor || 12} Bulan
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold block">Pinjaman Diajukan:</span>
                    <p className="font-black text-amber-700 text-sm">{formatRupiah(selectedApp.requested_amount)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Jangka Waktu:</span>
                    <p className="font-bold text-slate-800">{selectedApp.requested_tenor || 12} Bulan</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Estimasi Cicilan:</span>
                    <p className="font-black text-[#1e3a8a] text-sm">
                      {formatRupiah(selectedApp.monthly_installment || Math.round((selectedApp.requested_amount * (1 + 0.02 * ((selectedApp.requested_tenor || 12) / 12))) / (selectedApp.requested_tenor || 12)))}/bln
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Bagian Data Nasabah */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-primary-700">
                1. Data Nasabah
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 font-bold">NIK:</span>
                  <p className="font-mono font-black text-slate-800">{selectedApp.nik}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold">Tanggal Lahir:</span>
                  <p className="font-bold text-slate-800">{selectedApp.birth_date}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold">Nama Ibu Kandung:</span>
                  <p className="font-bold text-slate-800">{selectedApp.mother_name}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold">Status Saat Ini:</span>
                  <p className="font-black capitalize text-slate-800">{selectedApp.status}</p>
                </div>
                {selectedApp.full_name && (
                  <div className="col-span-2">
                    <span className="text-slate-400 font-bold">Nama Lengkap (KTP):</span>
                    <p className="font-bold text-slate-800">{selectedApp.full_name}</p>
                  </div>
                )}
                {selectedApp.birth_place && (
                  <div>
                    <span className="text-slate-400 font-bold">Tempat Lahir:</span>
                    <p className="font-bold text-slate-800">{selectedApp.birth_place}</p>
                  </div>
                )}
              </div>

              {/* Detail Alamat KTP & Domisili */}
              {(selectedApp.ktp_address || selectedApp.ktp_province) && (
                <div className="pt-2 border-t border-slate-200/60 text-xs space-y-1">
                  <span className="text-slate-400 font-bold block">Alamat Sesuai KTP:</span>
                  <p className="font-medium text-slate-700 leading-relaxed">
                    {selectedApp.ktp_address}
                    {[selectedApp.ktp_village, selectedApp.ktp_district, selectedApp.ktp_city, selectedApp.ktp_province]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              )}
              {(selectedApp.domicile_address || selectedApp.domicile_province) && (
                <div className="pt-2 border-t border-slate-200/60 text-xs space-y-1">
                  <span className="text-slate-400 font-bold block">Domisili Saat Ini:</span>
                  <p className="font-medium text-slate-700 leading-relaxed">
                    {selectedApp.domicile_address}
                    {[selectedApp.domicile_village, selectedApp.domicile_district, selectedApp.domicile_city, selectedApp.domicile_province]
                      .filter(Boolean)
                      .join(", ")}
                    {selectedApp.residence_years ? ` (Lama menempati: ${selectedApp.residence_years} tahun)` : ""}
                  </p>
                </div>
              )}
            </div>

            {/* Bagian Data Pekerjaan */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-blue-600">
                2. Data Pekerjaan
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 font-bold">Profesi:</span>
                  <p className="font-bold text-slate-800">{selectedApp.job_type}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold">Nama Kantor:</span>
                  <p className="font-bold text-slate-800">{selectedApp.company_name}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold">Penghasilan Bulanan:</span>
                  <p className="font-black text-emerald-600">{formatRupiah(selectedApp.monthly_income)}</p>
                </div>
              </div>
            </div>

            {/* Bagian Kontak Darurat */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600">
                3. Kontak Darurat
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 font-bold">Nama Kontak:</span>
                  <p className="font-bold text-slate-800">{selectedApp.emergency_name}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold">Nomor HP:</span>
                  <p className="font-bold text-slate-800">{selectedApp.emergency_phone}</p>
                </div>
              </div>
            </div>

            {/* Dokumen Foto KTP & Selfie */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                1. Dokumen Identitas &amp; Selfie
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 mb-1">Foto KTP Depan</p>
                  {selectedApp.ktp_image ? (
                    <a
                      href={fileUrl(selectedApp.ktp_image)}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-2xl border border-slate-200 hover:opacity-90"
                    >
                      <img
                        src={fileUrl(selectedApp.ktp_image)}
                        alt="KTP Depan"
                        className="h-28 w-full object-cover"
                      />
                    </a>
                  ) : (
                    <div className="grid h-28 place-items-center rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                      Tidak ada KTP Depan
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-[11px] font-bold text-slate-500 mb-1">Foto KTP Belakang</p>
                  {selectedApp.ktp_back_image ? (
                    <a
                      href={fileUrl(selectedApp.ktp_back_image)}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-2xl border border-slate-200 hover:opacity-90"
                    >
                      <img
                        src={fileUrl(selectedApp.ktp_back_image)}
                        alt="KTP Belakang"
                        className="h-28 w-full object-cover"
                      />
                    </a>
                  ) : (
                    <div className="grid h-28 place-items-center rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                      Tidak ada KTP Belakang
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-[11px] font-bold text-slate-500 mb-1">Foto Selfie</p>
                  {selectedApp.selfie_image ? (
                    <a
                      href={fileUrl(selectedApp.selfie_image)}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-2xl border border-slate-200 hover:opacity-90"
                    >
                      <img
                        src={fileUrl(selectedApp.selfie_image)}
                        alt="Selfie"
                        className="h-28 w-full object-cover"
                      />
                    </a>
                  ) : (
                    <div className="grid h-28 place-items-center rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                      Tidak ada foto Selfie
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Dokumen Pendukung (Data Tambahan) */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                2. Dokumen Pendukung (Data Tambahan)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* KK */}
                <div>
                  <p className="text-[11px] font-bold text-slate-500 mb-1">Kartu Keluarga (Wajib)</p>
                  {selectedApp.kk_image ? (
                    <a
                      href={fileUrl(selectedApp.kk_image)}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-2xl border border-slate-200 hover:opacity-90"
                    >
                      <img src={fileUrl(selectedApp.kk_image)} alt="KK" className="h-24 w-full object-cover" />
                    </a>
                  ) : (
                    <div className="grid h-24 place-items-center rounded-2xl border border-dashed border-slate-200 text-[11px] text-slate-400 text-center px-1">
                      Belum diupload
                    </div>
                  )}
                </div>

                {/* Slip Gaji */}
                <div>
                  <p className="text-[11px] font-bold text-slate-500 mb-1">Slip Gaji</p>
                  {selectedApp.slip_gaji_image ? (
                    <a
                      href={fileUrl(selectedApp.slip_gaji_image)}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-2xl border border-slate-200 hover:opacity-90"
                    >
                      <img src={fileUrl(selectedApp.slip_gaji_image)} alt="Slip Gaji" className="h-24 w-full object-cover" />
                    </a>
                  ) : (
                    <div className="grid h-24 place-items-center rounded-2xl border border-dashed border-slate-200 text-[11px] text-slate-400 text-center px-1">
                      Tidak dilampirkan
                    </div>
                  )}
                </div>

                {/* NPWP */}
                <div>
                  <p className="text-[11px] font-bold text-slate-500 mb-1">NPWP</p>
                  {selectedApp.npwp_image ? (
                    <a
                      href={fileUrl(selectedApp.npwp_image)}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-2xl border border-slate-200 hover:opacity-90"
                    >
                      <img src={fileUrl(selectedApp.npwp_image)} alt="NPWP" className="h-24 w-full object-cover" />
                    </a>
                  ) : (
                    <div className="grid h-24 place-items-center rounded-2xl border border-dashed border-slate-200 text-[11px] text-slate-400 text-center px-1">
                      Tidak dilampirkan
                    </div>
                  )}
                </div>

                {/* BPJS */}
                <div>
                  <p className="text-[11px] font-bold text-slate-500 mb-1">BPJS Ketenagakerjaan</p>
                  {selectedApp.bpjs_image ? (
                    <a
                      href={fileUrl(selectedApp.bpjs_image)}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-2xl border border-slate-200 hover:opacity-90"
                    >
                      <img src={fileUrl(selectedApp.bpjs_image)} alt="BPJS" className="h-24 w-full object-cover" />
                    </a>
                  ) : (
                    <div className="grid h-24 place-items-center rounded-2xl border border-dashed border-slate-200 text-[11px] text-slate-400 text-center px-1">
                      Tidak dilampirkan
                    </div>
                  )}
                </div>

                {/* Ijazah */}
                <div>
                  <p className="text-[11px] font-bold text-slate-500 mb-1">Ijazah Terakhir</p>
                  {selectedApp.ijazah_image ? (
                    <a
                      href={fileUrl(selectedApp.ijazah_image)}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-2xl border border-slate-200 hover:opacity-90"
                    >
                      <img src={fileUrl(selectedApp.ijazah_image)} alt="Ijazah" className="h-24 w-full object-cover" />
                    </a>
                  ) : (
                    <div className="grid h-24 place-items-center rounded-2xl border border-dashed border-slate-200 text-[11px] text-slate-400 text-center px-1">
                      Tidak dilampirkan
                    </div>
                  )}
                </div>

                {/* Passport */}
                <div>
                  <p className="text-[11px] font-bold text-slate-500 mb-1">Passport</p>
                  {selectedApp.passport_image ? (
                    <a
                      href={fileUrl(selectedApp.passport_image)}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-2xl border border-slate-200 hover:opacity-90"
                    >
                      <img src={fileUrl(selectedApp.passport_image)} alt="Passport" className="h-24 w-full object-cover" />
                    </a>
                  ) : (
                    <div className="grid h-24 place-items-center rounded-2xl border border-dashed border-slate-200 text-[11px] text-slate-400 text-center px-1">
                      Tidak dilampirkan
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Atur Limit yang Disetujui */}
            {selectedApp.status !== "approved" && (
              <div className="rounded-2xl border border-primary-100 bg-primary-50/50 p-4 space-y-2">
                <label className="block text-xs font-bold text-primary-900">
                  Limit PayLater yang Diberikan (Rp)
                </label>
                <input
                  type="number"
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm font-black text-slate-800 focus:border-primary-600 focus:outline-none"
                  value={approvedLimit}
                  onChange={(e) => setApprovedLimit(Number(e.target.value))}
                  placeholder="50000000"
                />
              </div>
            )}

            {/* Tombol Aksi */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => setSelectedApp(null)}>
                Tutup
              </Button>
              {selectedApp.status !== "rejected" && (
                <Button
                  type="button"
                  variant="outline"
                  icon={X}
                  loading={processing}
                  onClick={() => handleUpdateStatus(selectedApp.id, "rejected")}
                  className="!text-rose-600 !border-rose-200 hover:!bg-rose-50"
                >
                  Tolak
                </Button>
              )}
              {selectedApp.status !== "approved" && (
                <Button
                  type="button"
                  icon={Check}
                  loading={processing}
                  onClick={() => handleUpdateStatus(selectedApp.id, "approved")}
                >
                  Setujui &amp; Beri Limit
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Konfirmasi ACC Semua / Terpilih */}
      <Modal
        open={openBulkModal}
        onClose={() => !processingBulk && setOpenBulkModal(false)}
        title="Persetujuan Massal (ACC Sekaligus)"
      >
        <div className="space-y-4 text-xs font-semibold text-slate-700">
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-amber-900 space-y-1.5">
            <p className="font-black text-sm flex items-center gap-2">
              <CheckCheck className="h-5 w-5 text-emerald-600" />
              {bulkMode === "all_pending"
                ? "Konfirmasi ACC Seluruh Pengajuan Pending"
                : `Konfirmasi ACC ${selectedIds.length} Pengajuan Terpilih`}
            </p>
            <p className="text-xs font-medium text-amber-800 leading-relaxed">
              {bulkMode === "all_pending"
                ? "Sistem akan secara otomatis menyetujui seluruh pengajuan PayLater yang berstatus Menunggu Verifikasi di database tanpa perlu membuka satu per satu."
                : `Sistem akan menyetujui ${selectedIds.length} pengajuan yang telah Anda pilih sekaligus.`}
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Limit Standar Fallback (Rp)
            </label>
            <input
              type="text"
              className="w-full rounded-2xl border border-slate-200 p-3 text-xs sm:text-sm font-semibold text-slate-800 focus:border-primary-600 focus:outline-none"
              value={formatRupiah(bulkLimit)}
              onChange={(e) => setBulkLimit(Number(digitsOnly(e.target.value)) || 0)}
              placeholder="Rp 50.000.000"
            />
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
              *Catatan: Pemohon yang telah memilih nominal pinjaman saat simulasi akan otomatis mendapatkan limit sesuai nominal yang diajukan masing-masing. Limit standar di atas hanya digunakan jika pemohon tidak memilih nominal pinjaman.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpenBulkModal(false)}
              disabled={processingBulk}
            >
              Batal
            </Button>
            <Button
              type="button"
              icon={processingBulk ? Loader2 : CheckCheck}
              onClick={handleBulkApprove}
              disabled={processingBulk}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md shadow-emerald-600/20"
            >
              {processingBulk ? "Memproses..." : "Ya, ACC Sekarang"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
