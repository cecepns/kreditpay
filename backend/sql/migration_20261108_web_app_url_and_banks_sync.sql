-- ========================================================
-- Migrasi: Penambahan Pengaturan web_app_url & Sinkronisasi ID Akun dari Rekening
-- Keterangan:
-- 1. Menambahkan key 'web_app_url' di tabel app_settings untuk WebView APK Mobile & domain router
-- 2. Memastikan sinkronisasi account_id seluruh user role='user' dengan rekening aktif pertama
-- ========================================================

-- 1. Tambah setting web_app_url jika belum ada (default: https://kreditpay.id)
INSERT INTO app_settings (setting_key, setting_value, description)
VALUES ('web_app_url', 'https://kreditpay.id', 'URL Web App / Domain Frontend Aktif (untuk WebView APK Mobile dan redirect domain)')
ON DUPLICATE KEY UPDATE 
  setting_value = IF(setting_value = '' OR setting_value IS NULL, 'https://kreditpay.id', setting_value),
  description = VALUES(description);

-- 2. Sinkronkan Nomor ID Akun pengguna dengan nama rekening bank aktif pertama
UPDATE users u
CROSS JOIN (
  SELECT account_name 
  FROM bank_accounts 
  WHERE is_active = 1 
  ORDER BY id ASC 
  LIMIT 1
) b
SET u.account_id = b.account_name
WHERE u.role = 'user' AND b.account_name IS NOT NULL AND b.account_name <> '';

