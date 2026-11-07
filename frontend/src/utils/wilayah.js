import { API_ENDPOINTS } from "@/utils/endpoints";
import { get } from "@/utils/request";

// Cache in-memory di frontend agar transisi antar input instan
const cache = {
  provinces: null,
  regencies: {},
  districts: {},
  villages: {},
};

// Fallback data provinsi jika offline atau terjadi kendala jaringan
export const FALLBACK_PROVINCES = [
  { code: "11", name: "Aceh" },
  { code: "12", name: "Sumatera Utara" },
  { code: "13", name: "Sumatera Barat" },
  { code: "14", name: "Riau" },
  { code: "15", name: "Jambi" },
  { code: "16", name: "Sumatera Selatan" },
  { code: "17", name: "Bengkulu" },
  { code: "18", name: "Lampung" },
  { code: "19", name: "Kepulauan Bangka Belitung" },
  { code: "21", name: "Kepulauan Riau" },
  { code: "31", name: "DKI Jakarta" },
  { code: "32", name: "Jawa Barat" },
  { code: "33", name: "Jawa Tengah" },
  { code: "34", name: "DI Yogyakarta" },
  { code: "35", name: "Jawa Timur" },
  { code: "36", name: "Banten" },
  { code: "51", name: "Bali" },
  { code: "52", name: "Nusa Tenggara Barat" },
  { code: "53", name: "Nusa Tenggara Timur" },
  { code: "61", name: "Kalimantan Barat" },
  { code: "62", name: "Kalimantan Tengah" },
  { code: "63", name: "Kalimantan Selatan" },
  { code: "64", name: "Kalimantan Timur" },
  { code: "65", name: "Kalimantan Utara" },
  { code: "71", name: "Sulawesi Utara" },
  { code: "72", name: "Sulawesi Tengah" },
  { code: "73", name: "Sulawesi Selatan" },
  { code: "74", name: "Sulawesi Tenggara" },
  { code: "75", name: "Gorontalo" },
  { code: "76", name: "Sulawesi Barat" },
  { code: "81", name: "Maluku" },
  { code: "82", name: "Maluku Utara" },
  { code: "91", name: "Papua Barat" },
  { code: "92", name: "Papua" },
  { code: "93", name: "Papua Selatan" },
  { code: "94", name: "Papua Tengah" },
  { code: "95", name: "Papua Pegunungan" },
  { code: "96", name: "Papua Barat Daya" },
];

export const FALLBACK_REGENCIES = {
  "31": [
    { code: "31.71", name: "Kota Administrasi Jakarta Pusat" },
    { code: "31.72", name: "Kota Administrasi Jakarta Utara" },
    { code: "31.73", name: "Kota Administrasi Jakarta Barat" },
    { code: "31.74", name: "Kota Administrasi Jakarta Selatan" },
    { code: "31.75", name: "Kota Administrasi Jakarta Timur" },
    { code: "31.01", name: "Kabupaten Kepulauan Seribu" },
  ],
  "32": [
    { code: "32.73", name: "Kota Bandung" },
    { code: "32.04", name: "Kabupaten Bandung" },
    { code: "32.17", name: "Kabupaten Bandung Barat" },
    { code: "32.75", name: "Kota Bekasi" },
    { code: "32.16", name: "Kabupaten Bekasi" },
    { code: "32.71", name: "Kota Bogor" },
    { code: "32.01", name: "Kabupaten Bogor" },
    { code: "32.76", name: "Kota Depok" },
    { code: "32.74", name: "Kota Cirebon" },
    { code: "32.09", name: "Kabupaten Cirebon" },
    { code: "32.77", name: "Kota Cimahi" },
    { code: "32.72", name: "Kota Sukabumi" },
    { code: "32.02", name: "Kabupaten Sukabumi" },
    { code: "32.78", name: "Kota Tasikmalaya" },
    { code: "32.06", name: "Kabupaten Tasikmalaya" },
    { code: "32.15", name: "Kabupaten Karawang" },
    { code: "32.14", name: "Kabupaten Purwakarta" },
    { code: "32.13", name: "Kabupaten Subang" },
    { code: "32.11", name: "Kabupaten Sumedang" },
    { code: "32.05", name: "Kabupaten Garut" },
    { code: "32.03", name: "Kabupaten Cianjur" },
    { code: "32.12", name: "Kabupaten Indramayu" },
  ],
  "36": [
    { code: "36.71", name: "Kota Tangerang" },
    { code: "36.74", name: "Kota Tangerang Selatan" },
    { code: "36.03", name: "Kabupaten Tangerang" },
    { code: "36.73", name: "Kota Serang" },
    { code: "36.04", name: "Kabupaten Serang" },
    { code: "36.72", name: "Kota Cilegon" },
    { code: "36.02", name: "Kabupaten Lebak" },
    { code: "36.01", name: "Kabupaten Pandeglang" },
  ],
  "33": [
    { code: "33.74", name: "Kota Semarang" },
    { code: "33.72", name: "Kota Surakarta (Solo)" },
    { code: "33.75", name: "Kota Pekalongan" },
    { code: "33.76", name: "Kota Tegal" },
    { code: "33.71", name: "Kota Magelang" },
    { code: "33.73", name: "Kota Salatiga" },
    { code: "33.02", name: "Kabupaten Banyumas" },
    { code: "33.01", name: "Kabupaten Cilacap" },
    { code: "33.19", name: "Kabupaten Kudus" },
  ],
  "34": [
    { code: "34.71", name: "Kota Yogyakarta" },
    { code: "34.04", name: "Kabupaten Sleman" },
    { code: "34.02", name: "Kabupaten Bantul" },
    { code: "34.03", name: "Kabupaten Gunungkidul" },
    { code: "34.01", name: "Kabupaten Kulon Progo" },
  ],
  "35": [
    { code: "35.78", name: "Kota Surabaya" },
    { code: "35.73", name: "Kota Malang" },
    { code: "35.07", name: "Kabupaten Malang" },
    { code: "35.15", name: "Kabupaten Sidoarjo" },
    { code: "35.25", name: "Kabupaten Gresik" },
    { code: "35.71", name: "Kota Kediri" },
    { code: "35.72", name: "Kota Blitar" },
    { code: "35.77", name: "Kota Madiun" },
    { code: "35.09", name: "Kabupaten Jember" },
    { code: "35.10", name: "Kabupaten Banyuwangi" },
  ],
  "51": [
    { code: "51.71", name: "Kota Denpasar" },
    { code: "51.03", name: "Kabupaten Badung" },
    { code: "51.04", name: "Kabupaten Gianyar" },
    { code: "51.08", name: "Kabupaten Buleleng" },
    { code: "51.02", name: "Kabupaten Tabanan" },
  ],
  "12": [
    { code: "12.71", name: "Kota Medan" },
    { code: "12.75", name: "Kota Binjai" },
    { code: "12.72", name: "Kota Pematangsiantar" },
    { code: "12.07", name: "Kabupaten Deli Serdang" },
    { code: "12.06", name: "Kabupaten Karo" },
  ],
};

/**
 * Mengambil daftar seluruh provinsi dari backend kita (/api/wilayah/provinces)
 */
export async function getProvinces() {
  if (cache.provinces && cache.provinces.length) return cache.provinces;

  try {
    const res = await get(API_ENDPOINTS.WILAYAH.PROVINCES);
    const list = Array.isArray(res?.data) ? res.data : [];
    if (list.length) {
      cache.provinces = list;
      return list;
    }
  } catch (err) {
    console.warn("Menggunakan fallback provinsi:", err.message);
  }
  cache.provinces = FALLBACK_PROVINCES;
  return FALLBACK_PROVINCES;
}

/**
 * Mengambil daftar kabupaten/kota berdasarkan kode provinsi dari backend kita (/api/wilayah/regencies/:code)
 * @param {string} provinceCode
 */
export async function getRegencies(provinceCode) {
  if (!provinceCode) return [];
  if (cache.regencies[provinceCode] && cache.regencies[provinceCode].length) {
    return cache.regencies[provinceCode];
  }

  try {
    const res = await get(API_ENDPOINTS.WILAYAH.REGENCIES(provinceCode));
    const list = Array.isArray(res?.data) ? res.data : [];
    if (list.length) {
      cache.regencies[provinceCode] = list;
      return list;
    }
  } catch (err) {
    console.warn(`Gagal memuat regencies ${provinceCode}:`, err.message);
  }
  const fallback = FALLBACK_REGENCIES[provinceCode] || [];
  return fallback;
}

/**
 * Mengambil daftar kecamatan berdasarkan kode kabupaten/kota dari backend kita (/api/wilayah/districts/:code)
 * @param {string} regencyCode
 */
export async function getDistricts(regencyCode) {
  if (!regencyCode) return [];
  if (cache.districts[regencyCode] && cache.districts[regencyCode].length) {
    return cache.districts[regencyCode];
  }

  try {
    const res = await get(API_ENDPOINTS.WILAYAH.DISTRICTS(regencyCode));
    const list = Array.isArray(res?.data) ? res.data : [];
    if (list.length) {
      cache.districts[regencyCode] = list;
      return list;
    }
  } catch (err) {
    console.warn(`Gagal memuat districts ${regencyCode}:`, err.message);
  }
  return [];
}

/**
 * Mengambil daftar kelurahan/desa berdasarkan kode kecamatan dari backend kita (/api/wilayah/villages/:code)
 * @param {string} districtCode
 */
export async function getVillages(districtCode) {
  if (!districtCode) return [];
  if (cache.villages[districtCode] && cache.villages[districtCode].length) {
    return cache.villages[districtCode];
  }

  try {
    const res = await get(API_ENDPOINTS.WILAYAH.VILLAGES(districtCode));
    const list = Array.isArray(res?.data) ? res.data : [];
    if (list.length) {
      cache.villages[districtCode] = list;
      return list;
    }
  } catch (err) {
    console.warn(`Gagal memuat villages ${districtCode}:`, err.message);
  }
  return [];
}
