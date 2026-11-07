CREATE DATABASE IF NOT EXISTS kreditpay CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE kreditpay;

DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS paylater_applications;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS bank_accounts;
DROP TABLE IF EXISTS promos;
DROP TABLE IF EXISTS app_settings;
DROP TABLE IF EXISTS level_configs;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  username VARCHAR(30) NOT NULL UNIQUE,
  email VARCHAR(120) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL UNIQUE,
  pin_hash VARCHAR(255) NOT NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  level INT NOT NULL DEFAULT 1,
  avatar VARCHAR(255) NULL,
  balance DECIMAL(18,2) NOT NULL DEFAULT 0,
  paylater_limit DECIMAL(18,2) NOT NULL DEFAULT 0,
  paylater_used DECIMAL(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_name (name),
  INDEX idx_users_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('topup','transfer_out','transfer_in','ppob') NOT NULL,
  title VARCHAR(150) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  source ENUM('balance','paylater') NOT NULL DEFAULT 'balance',
  status ENUM('success','pending','failed') NOT NULL DEFAULT 'success',
  target VARCHAR(100) NULL,
  proof VARCHAR(255) NULL,
  reference VARCHAR(40) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tx_user_created (user_id, created_at),
  INDEX idx_tx_reference (reference),
  CONSTRAINT fk_tx_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  title VARCHAR(150) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_created (created_at),
  INDEX idx_notif_user (user_id),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE bank_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bank_name VARCHAR(50) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  account_name VARCHAR(100) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bank_name (bank_name),
  INDEX idx_bank_active (is_active)
) ENGINE=InnoDB;

CREATE TABLE paylater_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  requested_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  requested_tenor INT NOT NULL DEFAULT 12,
  monthly_installment DECIMAL(18,2) NOT NULL DEFAULT 0,
  full_name VARCHAR(100) NULL,
  nik VARCHAR(20) NOT NULL,
  birth_place VARCHAR(100) NULL,
  birth_date VARCHAR(30) NOT NULL,
  mother_name VARCHAR(100) NOT NULL,
  ktp_address TEXT NULL,
  ktp_province VARCHAR(100) NULL,
  ktp_city VARCHAR(100) NULL,
  ktp_district VARCHAR(100) NULL,
  ktp_village VARCHAR(100) NULL,
  domicile_address TEXT NULL,
  domicile_province VARCHAR(100) NULL,
  domicile_city VARCHAR(100) NULL,
  domicile_district VARCHAR(100) NULL,
  domicile_village VARCHAR(100) NULL,
  residence_years VARCHAR(50) NULL,
  job_type VARCHAR(100) NOT NULL,
  company_name VARCHAR(100) NOT NULL,
  monthly_income DECIMAL(18,2) NOT NULL DEFAULT 0,
  emergency_name VARCHAR(100) NOT NULL,
  emergency_relation VARCHAR(50) NULL,
  emergency_phone VARCHAR(20) NOT NULL,
  emergency_address TEXT NULL,
  ktp_image VARCHAR(255) NULL,
  ktp_back_image VARCHAR(255) NULL,
  selfie_image VARCHAR(255) NULL,
  kk_image VARCHAR(255) NULL,
  slip_gaji_image VARCHAR(255) NULL,
  npwp_image VARCHAR(255) NULL,
  bpjs_image VARCHAR(255) NULL,
  ijazah_image VARCHAR(255) NULL,
  passport_image VARCHAR(255) NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pl_user (user_id),
  CONSTRAINT fk_pl_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  sender_role ENUM('user','admin') NOT NULL,
  sender_id INT NOT NULL,
  message TEXT NOT NULL,
  attachment VARCHAR(255) NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_chat_user_created (user_id, created_at),
  INDEX idx_chat_unread (user_id, is_read),
  CONSTRAINT fk_chat_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE level_configs (
  level INT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  badge_label VARCHAR(100) NOT NULL,
  title TEXT NOT NULL,
  subtitle VARCHAR(150) NULL,
  message TEXT NOT NULL,
  note TEXT NULL,
  button_text VARCHAR(100) NOT NULL,
  secondary_button_text VARCHAR(100) NULL,
  detail_title VARCHAR(150) NULL,
  detail_content TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE promos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tag VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  style VARCHAR(100) NOT NULL DEFAULT 'from-emerald-500 to-accent-500',
  link_url VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_promo_active (is_active),
  INDEX idx_promo_sort (sort_order)
) ENGINE=InnoDB;

CREATE TABLE app_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value TEXT NOT NULL,
  description VARCHAR(255) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Sample data (Password admin & chrisbayu: 123456)
INSERT INTO users (name, username, email, phone, pin_hash, role, level, balance, paylater_limit) VALUES
('Administrator', 'admin', 'admin@kreditpay.id', '081200000001', '$2a$10$.BRS7ReLr3jBz/pXFmSDB.lapciLx6Fgbwe8RodEuID3pe3SmCeci', 'admin', 7, 0, 0),
('Chrisbayu', 'chrisbayu', 'chrisbayu@kreditpay.id', '081200000002', '$2a$10$.BRS7ReLr3jBz/pXFmSDB.lapciLx6Fgbwe8RodEuID3pe3SmCeci', 'user', 1, 10000000, 1000000000);

-- Sample data rekening bank
INSERT INTO bank_accounts (bank_name, account_number, account_name, is_active) VALUES
('BCA', '123456789', 'MAS KU', 1),
('Mandiri', '1370012345678', 'MAS KU', 1),
('BRI', '001201098765432', 'MAS KU', 1);

-- Sample data level configs
INSERT INTO level_configs (level, name, badge_label, title, subtitle, message, note, button_text, secondary_button_text, detail_title, detail_content) VALUES
(1, 'Level 1', 'Pop-up Terkunci', 'Fitur Terkunci', 'Akses Dibatasi', 'Maaf, Anda masih berada di Level 1. Silakan Top Up saldo untuk membuka fitur ini.', 'Lakukan top up saldo minimal untuk menaikkan level akun Anda.', 'Top Up Sekarang', 'Kembali', 'Informasi Level 1', 'Akun Level 1 merupakan tingkat awal. Pengguna perlu melakukan verifikasi dan transaksi deposit awal untuk membuka fitur transaksi penuh.'),
(2, 'Level 2', 'Info Autodebet', 'Rekening Belum Terintegrasi Autodebet', 'Integrasi Pembayaran', 'Autodebet adalah sistem pembayaran otomatis yang memungkinkan saldo Anda terpotong langsung untuk membayar tagihan tepat waktu.', 'Fitur ini wajib diaktifkan demi keamanan dan kelancaran transaksi Anda.', 'Lanjutkan Integrasi', 'Kembali', 'Ketentuan Integrasi Autodebet', 'Sistem autodebet memastikan pembayaran angsuran dan tagihan berjalan otomatis tanpa kendala.'),
(3, 'Level 3', 'Info Asuransi', 'Transfer ke Rekening', 'ANDA TERTUNDA', 'Sistem keamanan kami menahan transaksi ini karena memerlukan Verifikasi Asuransi pada akun Anda. Mohon selesaikan administrasi asuransi agar dana dapat dicairkan ke rekening tujuan dengan aman.', 'Fitur asuransi memastikan transaksi pencairan dana Anda terlindungi secara penuh.', 'Cek Detail Keterangan', 'Batalkan Transaksi', 'Ketentuan Asuransi Dana', '[{\"header\":\"Mengapa perlu Asuransi?\",\"body\":\"Sesuai dengan kebijakan keamanan transaksi tingkat tinggi (Level 3+), pencairan dana memerlukan Deposit Asuransi Sementara. Ini bertujuan untuk memverifikasi bahwa rekening penerima adalah valid dan aktif.\"},{\"header\":\"Apakah Dana Kembali?\",\"body\":\"YA, 100% KEMBALI. Dana asuransi ini bersifat Refundable. Setelah sistem berhasil memverifikasi transfer masuk, dana asuransi akan otomatis dikembalikan ke saldo akun Anda dalam waktu 10-30 menit bersamaan dengan dana transfer Anda.\"}]'),
(4, 'Level 4', 'Pindah Saldo', 'Transfer Saldo <br><span class=\"text-teal-400\">PayLater Sedang Proses</span>', 'PINDAH SALDO', 'Permintaan pemindahan limit PayLater ke Saldo Utama Anda sedang diproses oleh sistem.', 'Silakan lakukan konfirmasi pemindahan saldo untuk melanjutkan transaksi.', 'Pindahkan Saldo', 'Batal', 'Rincian Perpindahan', '{\"fee_warning\":\"Perpindahan Saldo PayLater ke Saldo utama membutuhkan Dana Layanan. Dana tersebut harus melalui proses Topup Saldo menggunakan dana pribadi Anda.\\n\\nDana Layanan ini Akan Tetap Masuk ke Saldo Anda, tidak diambil perusahaan.\",\"fee_amount\":100000}'),
(5, 'Level 5', 'Pengembangan 1', 'Transfer Saldo <br><span class=\"text-teal-400\">PayLater Sedang Proses</span>', 'PINDAH SALDO', 'Permintaan pemindahan limit PayLater ke Saldo Utama Anda sedang diproses oleh sistem.', 'Silakan lakukan konfirmasi pemindahan saldo untuk melanjutkan transaksi.', 'Pindahkan Saldo', 'Batal', 'Rincian Perpindahan', '{\"fee_warning\":\"Perpindahan Saldo PayLater ke Saldo utama membutuhkan Dana Layanan. Dana tersebut harus melalui proses Topup Saldo menggunakan dana pribadi Anda.\\n\\nDana Layanan ini Akan Tetap Masuk ke Saldo Anda, tidak diambil perusahaan.\",\"fee_amount\":100000}'),
(6, 'Level 6', 'Pengembangan 2', 'Transfer Saldo <br><span class=\"text-teal-400\">PayLater Sedang Proses</span>', 'PINDAH SALDO', 'Permintaan pemindahan limit PayLater ke Saldo Utama Anda sedang diproses oleh sistem.', 'Silakan lakukan konfirmasi pemindahan saldo untuk melanjutkan transaksi.', 'Pindahkan Saldo', 'Batal', 'Rincian Perpindahan', '{\"fee_warning\":\"Perpindahan Saldo PayLater ke Saldo utama membutuhkan Dana Layanan. Dana tersebut harus melalui proses Topup Saldo menggunakan dana pribadi Anda.\\n\\nDana Layanan ini Akan Tetap Masuk ke Saldo Anda, tidak diambil perusahaan.\",\"fee_amount\":100000}'),
(7, 'Level 7', 'Fitur VIP/Prioritas', 'Transfer Saldo <br><span class=\"text-teal-400\">PayLater Sedang Proses</span>', 'PINDAH SALDO', 'Permintaan pemindahan limit PayLater ke Saldo Utama Anda sedang diproses oleh sistem.', 'Silakan lakukan konfirmasi pemindahan saldo untuk melanjutkan transaksi.', 'Pindahkan Saldo', 'Batal', 'Rincian Perpindahan', '{\"fee_warning\":\"Perpindahan Saldo PayLater ke Saldo utama membutuhkan Dana Layanan. Dana tersebut harus melalui proses Topup Saldo menggunakan dana pribadi Anda.\\n\\nDana Layanan ini Akan Tetap Masuk ke Saldo Anda, tidak diambil perusahaan.\",\"fee_amount\":100000}');

INSERT INTO notifications (title, body) VALUES
('Halo semua', 'Selamat datang di KreditPay! Nikmati kemudahan bertransaksi dengan PayLater hingga Rp 200.000.000.');

-- Sample data promos
INSERT INTO promos (tag, title, description, style, is_active, sort_order) VALUES
('FOOD', 'Diskon Rp 20rb Merchant Pilihan', 'Gunakan voucher diskon saat bertransaksi di merchant pilihan.', 'from-emerald-500 to-accent-500', 1, 1),
('PAYLATER', 'Cicilan 0% untuk 3 bulan pertama', 'Nikmati kemudahan cicilan 0% hingga 3 bulan dengan PayLater.', 'from-indigo-500 to-primary-600', 1, 2),
('PULSA', 'Cashback 10% isi pulsa pertama', 'Dapatkan cashback langsung ke saldo utama akun Anda.', 'from-rose-500 to-orange-400', 1, 3);

-- Sample data app settings
INSERT INTO app_settings (setting_key, setting_value, description) VALUES
('whatsapp_number', '081200000000', 'Nomor WhatsApp Layanan Bantuan / CS'),
('whatsapp_message', 'Halo Admin KreditPay, saya butuh bantuan terkait akun saya.', 'Pesan template awal saat user menghubungi CS via WhatsApp'),
('app_name', 'KreditPay', 'Nama Aplikasi'),
('cs_email', 'support@kreditpay.com', 'Email Dukungan Pelanggan'),
('cs_operational_hours', 'Senin - Minggu: 08:00 - 22:00 WIB', 'Jam Operasional CS');
