-- ========================================================
-- Migrasi: Penambahan Kolom account_id pada Tabel users
-- Fitur:
-- 1. Menyimpan Nomor ID Akun (account_id) untuk pengguna
-- 2. Mengikuti nama rekening bank aktif pertama
-- 3. Ditampilkan pada Atas Nama konfirmasi Top Up dan menu Akun
-- ========================================================

-- 1. Tambah kolom account_id jika belum ada
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS account_id VARCHAR(100) NULL AFTER phone;

-- 2. Tambah index pencarian jika belum ada
ALTER TABLE users 
ADD INDEX IF NOT EXISTS idx_users_account_id (account_id);

-- 3. Sinkronkan ID Akun semua user yang masih kosong/null dari rekening aktif pertama
UPDATE users u
CROSS JOIN (
  SELECT account_name 
  FROM bank_accounts 
  WHERE is_active = 1 
  ORDER BY id ASC 
  LIMIT 1
) b
SET u.account_id = b.account_name
WHERE (u.account_id IS NULL OR u.account_id = '') AND u.role = 'user';

