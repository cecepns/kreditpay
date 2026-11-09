-- ========================================================
-- Migrasi: Fitur Edit Profil User & Blokir Perangkat / IMEI
-- Tanggal: 2026-11-09
-- Fitur:
-- 1. Menyimpan device_id (IMEI / ID Perangkat) dan device_fingerprint di tabel users
-- 2. Menyimpan status blokir akun (is_blocked, blocked_reason) di tabel users
-- 3. Membuat tabel blocked_devices untuk memblokir pendaftaran ulang dan login dari HP/perangkat yang diblokir
-- ========================================================

-- 1. Tambah kolom device_id, device_fingerprint, is_blocked, dan blocked_reason pada tabel users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS device_id VARCHAR(128) NULL AFTER account_id,
  ADD COLUMN IF NOT EXISTS device_fingerprint VARCHAR(128) NULL AFTER device_id,
  ADD COLUMN IF NOT EXISTS is_blocked TINYINT(1) NOT NULL DEFAULT 0 AFTER level,
  ADD COLUMN IF NOT EXISTS blocked_reason VARCHAR(255) NULL AFTER is_blocked;

-- 2. Tambah index pencarian pada users
ALTER TABLE users
  ADD INDEX IF NOT EXISTS idx_users_device_id (device_id),
  ADD INDEX IF NOT EXISTS idx_users_device_fp (device_fingerprint),
  ADD INDEX IF NOT EXISTS idx_users_blocked (is_blocked);

-- 3. Buat tabel blocked_devices untuk daftar IMEI / Device ID yang diblokir
CREATE TABLE IF NOT EXISTS blocked_devices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_id VARCHAR(128) NULL,
  fingerprint VARCHAR(128) NULL,
  user_id INT NULL,
  reason VARCHAR(255) NULL,
  blocked_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_blocked_device_id (device_id),
  INDEX idx_blocked_fp (fingerprint),
  INDEX idx_blocked_user (user_id),
  CONSTRAINT fk_blocked_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

