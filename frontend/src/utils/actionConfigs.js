import { API_ENDPOINTS } from "@/utils/endpoints";
import { digitsOnly, formatRupiah } from "@/utils/format";

const amountField = (min, max) => ({
  name: "amount",
  label: "Nominal",
  placeholder: "0",
  inputMode: "numeric",
  format: digitsOnly,
  hint: (v) => (v ? formatRupiah(v) : ""),
  validate: (v) => {
    const n = Number(v);
    if (!n) return "Isi nominal";
    if (n < min) return `Minimal ${formatRupiah(min)}`;
    if (n > max) return `Maksimal ${formatRupiah(max)}`;
  },
});

export const actionConfigs = {
  topup: () => ({
    title: "Top Up Saldo",
    submitText: "Top Up",
    endpoint: API_ENDPOINTS.WALLET.TOPUP,
    initial: { amount: "" },
    fields: [amountField(10000, 50000000)],
    payload: (v) => ({ amount: Number(v.amount) }),
  }),

  transfer: () => ({
    title: "Transfer",
    submitText: "Kirim",
    endpoint: API_ENDPOINTS.WALLET.TRANSFER,
    initial: { to: "", amount: "" },
    fields: [
      { name: "to", label: "Username / No HP penerima", placeholder: "Contoh: chrisbayu", validate: (v) => (!v.trim() ? "Isi penerima" : undefined) },
      amountField(10000, 50000000),
    ],
    payload: (v) => ({ to: v.to.trim(), amount: Number(v.amount) }),
  }),

  pay: (service) => ({
    title: `Bayar ${service.label}`,
    submitText: "Bayar sekarang",
    endpoint: API_ENDPOINTS.PPOB.PAY,
    initial: { target: "", amount: "", source: "balance" },
    fields: [
      { name: "target", label: service.targetLabel, placeholder: service.placeholder, validate: (v) => (v.trim().length < 4 ? "Minimal 4 karakter" : undefined) },
      amountField(5000, 5000000),
      {
        name: "source",
        label: "Bayar dengan",
        as: "select",
        options: [{ value: "balance", label: "Saldo Utama" }, { value: "paylater", label: "Saldo PayLater" }],
      },
    ],
    payload: (v) => ({ service: service.key, target: v.target.trim(), amount: Number(v.amount), source: v.source }),
  }),
};
