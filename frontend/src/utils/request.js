import { api } from "@/utils/api";

export const getErrorMessage = (err) =>
  err?.response?.data?.message ||
  (err?.request ? "Tidak dapat terhubung ke server. Periksa koneksi internet kamu." : err?.message) ||
  "Terjadi kesalahan";

export async function request(method, url, { params, data, headers } = {}) {
  try {
    const res = await api.request({ method, url, params, data, headers });
    return res.data;
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
}

export const get = (url, params) => request("get", url, { params });
export const post = (url, data) => request("post", url, { data });
export const put = (url, data) => request("put", url, { data });
export const del = (url) => request("delete", url);
export const upload = (url, formData) =>
  request("post", url, { data: formData, headers: { "Content-Type": "multipart/form-data" } });
