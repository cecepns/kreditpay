import { api } from "@/utils/api";

export const getErrorMessage = (err) => {
  if (err?.code === "ECONNABORTED") {
    return "Koneksi terputus karena batas waktu (timeout). Pastikan koneksi internet stabil.";
  }
  return (
    err?.response?.data?.message ||
    (err?.request ? "Tidak dapat terhubung ke server. Periksa koneksi internet kamu." : err?.message) ||
    "Terjadi kesalahan"
  );
};

export async function request(method, url, { params, data, headers, timeout } = {}) {
  try {
    const res = await api.request({ method, url, params, data, headers, timeout });
    return res.data;
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
}

export const get = (url, params) => request("get", url, { params });
export const post = (url, data) => request("post", url, { data });
export const put = (url, data) => request("put", url, { data });
export const del = (url) => request("delete", url);
export const upload = (url, formData, config = {}) =>
  request("post", url, {
    data: formData,
    timeout: 120000, // 2 menit batas waktu pengunggahan berkas
    ...config,
  });
