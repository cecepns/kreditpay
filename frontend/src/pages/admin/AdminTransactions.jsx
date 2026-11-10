import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Check, Clock, FileImage, Search, X } from "lucide-react";
import usePaginated from "@/hooks/usePaginated";
import DataTable from "@/components/admin/DataTable";
import Pagination from "@/components/ui/Pagination";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { put } from "@/utils/request";
import { confirmToast } from "@/utils/confirm";
import { fileUrl, formatDateTime, formatRupiah } from "@/utils/format";

const ALLOWED_STATUSES = ["pending", "success", "failed"];
const ALLOWED_TYPES = ["topup", "ppob", "transfer_out", "transfer_in"];

export default function AdminTransactions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [previewProofTx, setPreviewProofTx] = useState(null);

  const rawStatus = searchParams.get("status") || "";
  const rawType = searchParams.get("type") || "";
  const statusFilter = ALLOWED_STATUSES.includes(rawStatus) ? rawStatus : "";
  const typeFilter = ALLOWED_TYPES.includes(rawType) ? rawType : "";

  const list = usePaginated(API_ENDPOINTS.ADMIN.TRANSACTIONS.LIST, {
    params: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(typeFilter ? { type: typeFilter } : {}),
    },
  });

  const handleFilterChange = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
    list.setPage(1);
  };

  const handleUpdateStatus = async (row, newStatus) => {
    const label = newStatus === "success" ? "Setujui" : "Tolak";
    const yes = await confirmToast({
      title: `${label} transaksi ini?`,
      message: `Ubah status transaksi ${row.reference} menjadi ${newStatus}.`,
      confirmText: `Ya, ${label}`,
    });
    if (!yes) return;

    try {
      const res = await put(API_ENDPOINTS.ADMIN.TRANSACTIONS.STATUS(row.id), { status: newStatus });
      toast.success(res.message || `Status berhasil diubah ke ${newStatus}`);
      if (previewProofTx?.id === row.id) setPreviewProofTx(null);
      list.reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const columns = [
    {
      key: "reference",
      label: "Referensi",
      render: (r) => (
        <div>
          <p className="font-extrabold text-slate-900">{r.reference}</p>
          {r.target && <p className="text-xs text-slate-400">{r.target}</p>}
        </div>
      ),
    },
    {
      key: "username",
      label: "Pengguna",
      sortable: true,
      render: (r) => (
        <div>
          <p className="font-extrabold text-slate-800">{r.user_name || r.username}</p>
          <p className="text-xs text-slate-400">@{r.username}</p>
        </div>
      ),
    },
    { key: "title", label: "Transaksi" },
    {
      key: "amount",
      label: "Nominal",
      sortable: true,
      render: (r) => (
        <span className="font-black text-slate-900">{formatRupiah(r.amount)}</span>
      ),
    },
    {
      key: "proof",
      label: "Bukti Bayar",
      render: (r) => {
        if (!r.proof) return <span className="text-xs font-semibold text-slate-400">-</span>;
        return (
          <button
            type="button"
            onClick={() => setPreviewProofTx(r)}
            className="group inline-flex items-center gap-1.5 rounded-xl border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-700 hover:bg-primary-100 transition"
          >
            <FileImage className="h-3.5 w-3.5" />
            <span>Lihat Bukti</span>
          </button>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (r) => {
        const s = r.status || "success";
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black ${
              s === "success"
                ? "bg-emerald-100 text-emerald-700"
                : s === "pending"
                ? "bg-amber-100 text-amber-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {s === "pending" && <Clock className="h-3 w-3" />}
            {s === "success" ? "Berhasil" : s === "pending" ? "Menunggu" : "Gagal"}
          </span>
        );
      },
    },
    {
      key: "created_at",
      label: "Waktu",
      sortable: true,
      render: (r) => formatDateTime(r.created_at),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">
            {typeFilter === "topup" ? "Konfirmasi Top Up" : "Transaksi & Pengajuan"}
          </h1>
          <p className="text-sm font-semibold text-slate-500">
            {typeFilter === "topup"
              ? "Verifikasi bukti transfer konfirmasi top up saldo dan proses persetujuan manual."
              : "Kelola pesanan pulsa, transaksi PPOB, top up saldo, verifikasi bukti transfer, dan proses persetujuan manual."}
          </p>
        </div>
        {(statusFilter || typeFilter) && (
          <button
            type="button"
            onClick={() => {
              setSearchParams({}, { replace: true });
              list.setPage(1);
            }}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-extrabold text-slate-700 hover:bg-slate-200 transition"
          >
            <X className="h-3.5 w-3.5" />
            Reset Filter
          </button>
        )}
      </div>

      <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={list.search}
              onChange={(e) => list.setSearch(e.target.value)}
              placeholder="Cari referensi / user..."
              className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-2.5 pl-10 pr-9 text-sm font-semibold focus:border-primary-500 focus:outline-none"
            />
            {list.search && (
              <button
                type="button"
                onClick={() => list.setSearch("")}
                aria-label="Hapus pencarian"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full sm:w-auto rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs font-extrabold text-slate-700 focus:outline-none"
            >
              <option value="">Semua Status</option>
              <option value="pending">Menunggu Verifikasi</option>
              <option value="success">Berhasil Disetujui</option>
              <option value="failed">Gagal / Ditolak</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => handleFilterChange("type", e.target.value)}
              className="w-full sm:w-auto rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs font-extrabold text-slate-700 focus:outline-none"
            >
              <option value="">Semua Jenis</option>
              <option value="topup">Konfirmasi Top Up</option>
              <option value="ppob">Pulsa &amp; Tagihan</option>
              <option value="transfer_out">Transfer Keluar</option>
              <option value="transfer_in">Transfer Masuk</option>
            </select>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={list.rows}
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
          sort={list.sort}
          onSort={list.toggleSort}
          actions={(row) => (
            <div className="inline-flex items-center gap-1.5">
              {row.status !== "success" && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(row, "success")}
                  title="Setujui / Selesaikan Transaksi"
                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-2.5 py-1.5 text-xs font-black text-emerald-700 hover:bg-emerald-100 transition"
                >
                  <Check className="h-3.5 w-3.5" />
                  Setujui
                </button>
              )}
              {row.status !== "failed" && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(row, "failed")}
                  title="Tolak / Batalkan"
                  className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-2.5 py-1.5 text-xs font-black text-red-600 hover:bg-red-100 transition"
                >
                  <X className="h-3.5 w-3.5" />
                  Tolak
                </button>
              )}
            </div>
          )}
        />

        <Pagination
          pagination={list.pagination}
          onPage={list.setPage}
          limit={list.limit}
          onLimit={list.setLimit}
        />
      </div>

      {/* Modal Pratinjau Foto Bukti Bayar */}
      <Modal
        open={!!previewProofTx}
        onClose={() => setPreviewProofTx(null)}
        title={`Bukti Pembayaran: ${previewProofTx?.reference}`}
      >
        {previewProofTx && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 text-xs flex justify-between items-center">
              <div>
                <p className="text-slate-400 font-bold">Pengguna</p>
                <p className="font-extrabold text-slate-800">
                  {previewProofTx.user_name || previewProofTx.username} (@{previewProofTx.username})
                </p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 font-bold">Nominal Transfer</p>
                <p className="font-black text-primary-700 text-sm">
                  {formatRupiah(previewProofTx.amount)}
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 max-h-[60vh] flex items-center justify-center p-2">
              <img
                src={fileUrl(previewProofTx.proof)}
                alt="Bukti Transfer"
                className="max-h-[55vh] w-auto rounded-xl object-contain shadow-sm"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" onClick={() => setPreviewProofTx(null)}>
                Tutup
              </Button>
              <div className="flex gap-2">
                {previewProofTx.status !== "failed" && (
                  <Button
                    variant="danger"
                    icon={X}
                    onClick={() => handleUpdateStatus(previewProofTx, "failed")}
                  >
                    Tolak
                  </Button>
                )}
                {previewProofTx.status !== "success" && (
                  <Button
                    icon={Check}
                    onClick={() => handleUpdateStatus(previewProofTx, "success")}
                  >
                    Setujui &amp; Tambah Saldo
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
