-- ========================================================
-- Migrasi: Toggle Layanan WhatsApp CS Profil User & Pesan Device Tidak Mendukung
-- Tanggal: 2026-11-10
-- Jalankan di phpMyAdmin pada database kreditpay aktif
-- ========================================================

-- 1. Tambah pengaturan tampilan Layanan Bantuan CS (WhatsApp) di halaman akun/profil user (default: '0' = tersembunyi/nonaktif)
INSERT IGNORE INTO app_settings (setting_key, setting_value, description) VALUES
('show_wa_cs_profile', '0', 'Tampilkan layanan bantuan WhatsApp CS di halaman profil akun user (1=tampil, 0=sembunyi)');

-- 2. Perbarui alasan blokir lama di tabel users dan blocked_devices menjadi "Device tidak mendukung"
UPDATE users
SET blocked_reason = 'Device tidak mendukung'
WHERE is_blocked = 1
  AND (blocked_reason IS NULL OR blocked_reason = '' OR LOWER(blocked_reason) LIKE '%blokir%');

UPDATE blocked_devices
SET reason = 'Device tidak mendukung'
WHERE reason IS NULL OR reason = '' OR LOWER(reason) LIKE '%blokir%';

