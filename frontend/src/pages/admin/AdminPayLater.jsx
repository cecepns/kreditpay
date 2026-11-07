import { useState } from "react";
import toast from "react-hot-toast";
import { Check, Eye, FileText, Search, X } from "lucide-react";
import useFetch from "@/hooks/useFetch";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/StateViews";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { put } from "@/utils/request";
import { formatDateTime, formatRupiah, fileUrl } from "@/utils/format";

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

        <div className="flex items-center gap-2">
          <select
            className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Semua Status</option>
            <option value="pending">Menunggu Verifikasi</option>
            <option value="approved">Disetujui</option>
            <option value="rejected">Ditolak</option>
          </select>

          <select
            className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            <option value={10}>10 / Hal</option>
            <option value={25}>25 / Hal</option>
            <option value={50}>50 / Hal</option>
          </select>
        </div>
      </div>

      {/* Tabel Pengajuan */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 space-y-4">
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs font-extrabold uppercase text-slate-400">
                <tr>
                  <th className="pb-3 pl-2">Pengguna</th>
                  <th className="pb-3">NIK &amp; Pekerjaan</th>
                  <th className="pb-3">Gaji Bulanan</th>
                  <th className="pb-3">Tanggal Pengajuan</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right pr-2">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {data.data.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60">
                    <td className="py-3.5 pl-2">
                      <p className="font-extrabold text-slate-800">{item.user_name || item.username}</p>
                      <p className="text-xs text-slate-400">@{item.username} · {item.user_phone}</p>
                    </td>
                    <td className="py-3.5">
                      <p className="font-bold text-slate-800 font-mono text-xs">{item.nik}</p>
                      <p className="text-xs text-slate-500">{item.job_type} · {item.company_name}</p>
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
                          setApprovedLimit(50000000);
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
    </div>
  );
}
