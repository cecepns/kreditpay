export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://api.kingcreativestudio.my.id/kreditpay/api";

export const FILE_BASE_URL =
  import.meta.env.VITE_FILE_URL || "https://api.kingcreativestudio.my.id/kreditpay";

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    PROFILE: "/auth/profile",
    AVATAR: "/auth/avatar",
  },
  DASHBOARD: { SUMMARY: "/dashboard" },
  WALLET: { TOPUP: "/wallet/topup", TRANSFER: "/wallet/transfer" },
  PPOB: { PAY: "/ppob/pay" },
  BANKS: { LIST: "/banks" },
  PAYLATER: {
    STATUS: "/paylater/status",
    APPLY: "/paylater/apply",
  },
  LEVELS: {
    LIST: "/levels",
    UPDATE: (level) => `/admin/levels/${level}`,
  },
  PROMOS: {
    LIST: "/promos",
  },
  SETTINGS: {
    PUBLIC: "/settings/public",
  },
  WILAYAH: {
    PROVINCES: "/wilayah/provinces",
    REGENCIES: (provinceCode) => `/wilayah/regencies/${provinceCode}`,
    DISTRICTS: (regencyCode) => `/wilayah/districts/${regencyCode}`,
    VILLAGES: (districtCode) => `/wilayah/villages/${districtCode}`,
  },
  TRANSACTIONS: { LIST: "/transactions" },
  NOTIFICATIONS: { LIST: "/notifications" },
  ADMIN: {
    USERS: {
      LIST: "/admin/users",
      DETAIL: (id) => `/admin/users/${id}`,
      LEVEL: (id) => `/admin/users/${id}/level`,
    },
    BANKS: { LIST: "/admin/banks", DETAIL: (id) => `/admin/banks/${id}` },
    NOTIFICATIONS: { LIST: "/admin/notifications", DETAIL: (id) => `/admin/notifications/${id}` },
    TRANSACTIONS: {
      LIST: "/admin/transactions",
      STATUS: (id) => `/admin/transactions/${id}/status`,
    },
    PAYLATER: {
      LIST: "/admin/paylater",
      STATUS: (id) => `/admin/paylater/${id}/status`,
    },
    PROMOS: {
      LIST: "/admin/promos",
      CREATE: "/admin/promos",
      DETAIL: (id) => `/admin/promos/${id}`,
    },
    SETTINGS: {
      GET: "/admin/settings",
      UPDATE: "/admin/settings",
    },
  },
};
