-- ===================================================================
-- MIGRATION SCRIPT: KreditPay Database Updates
-- Deskripsi: Menambahkan tabel Live Chat dan kolom-kolom baru pada
--            tabel pengajuan PayLater (Simulasi, KTP Belakang, Dokumen Pendukung).
-- Tanggal: 2026-11-07
-- Database: kreditpay
-- ===================================================================

USE kreditpay;

-- -------------------------------------------------------------------
-- 1. Tabel Baru: chat_messages (Fitur Live Chat Web User & Admin)
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------------
-- 2. Kolom Baru pada paylater_applications:
--    - Simulasi Pinjaman (requested_amount, requested_tenor, monthly_installment)
--    - Foto KTP Depan & Belakang (ktp_back_image)
--    - Data Identitas & Wilayah (full_name, birth_place, ktp_address, ktp_province, ktp_city, ktp_district, ktp_village)
--    - Data Domisili Saat Ini (domicile_address, domicile_province, domicile_city, domicile_district, domicile_village, residence_years)
--    - Kontak Kerabat (emergency_relation, emergency_address)
--    - Dokumen Pendukung Tambahan (kk_image, slip_gaji_image, npwp_image, bpjs_image, ijazah_image, passport_image)
-- -------------------------------------------------------------------

-- Menggunakan stored procedure agar ALTER TABLE aman dijalankan berulang kali (Idempotent)
DELIMITER $$

DROP PROCEDURE IF EXISTS AddColumnIfNotExists $$
CREATE PROCEDURE AddColumnIfNotExists(
    IN tableName VARCHAR(64),
    IN columnName VARCHAR(64),
    IN columnDefinition TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = tableName 
          AND COLUMN_NAME = columnName
    ) THEN
        SET @sqlStatement = CONCAT('ALTER TABLE ', tableName, ' ADD COLUMN ', columnName, ' ', columnDefinition);
        PREPARE stmt FROM @sqlStatement;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END $$

DELIMITER ;

-- Jalankan penambahan kolom:
CALL AddColumnIfNotExists('paylater_applications', 'requested_amount', 'DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER user_id');
CALL AddColumnIfNotExists('paylater_applications', 'requested_tenor', 'INT NOT NULL DEFAULT 12 AFTER requested_amount');
CALL AddColumnIfNotExists('paylater_applications', 'monthly_installment', 'DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER requested_tenor');

CALL AddColumnIfNotExists('paylater_applications', 'full_name', 'VARCHAR(100) NULL AFTER user_id');
CALL AddColumnIfNotExists('paylater_applications', 'birth_place', 'VARCHAR(100) NULL AFTER nik');
CALL AddColumnIfNotExists('paylater_applications', 'ktp_back_image', 'VARCHAR(255) NULL AFTER ktp_image');

CALL AddColumnIfNotExists('paylater_applications', 'ktp_address', 'TEXT NULL AFTER mother_name');
CALL AddColumnIfNotExists('paylater_applications', 'ktp_province', 'VARCHAR(100) NULL AFTER ktp_address');
CALL AddColumnIfNotExists('paylater_applications', 'ktp_city', 'VARCHAR(100) NULL AFTER ktp_province');
CALL AddColumnIfNotExists('paylater_applications', 'ktp_district', 'VARCHAR(100) NULL AFTER ktp_city');
CALL AddColumnIfNotExists('paylater_applications', 'ktp_village', 'VARCHAR(100) NULL AFTER ktp_district');

CALL AddColumnIfNotExists('paylater_applications', 'domicile_address', 'TEXT NULL AFTER ktp_village');
CALL AddColumnIfNotExists('paylater_applications', 'domicile_province', 'VARCHAR(100) NULL AFTER domicile_address');
CALL AddColumnIfNotExists('paylater_applications', 'domicile_city', 'VARCHAR(100) NULL AFTER domicile_province');
CALL AddColumnIfNotExists('paylater_applications', 'domicile_district', 'VARCHAR(100) NULL AFTER domicile_city');
CALL AddColumnIfNotExists('paylater_applications', 'domicile_village', 'VARCHAR(100) NULL AFTER domicile_district');
CALL AddColumnIfNotExists('paylater_applications', 'residence_years', 'VARCHAR(50) NULL AFTER domicile_village');

CALL AddColumnIfNotExists('paylater_applications', 'emergency_relation', 'VARCHAR(50) NULL AFTER emergency_name');
CALL AddColumnIfNotExists('paylater_applications', 'emergency_address', 'TEXT NULL AFTER emergency_phone');

CALL AddColumnIfNotExists('paylater_applications', 'kk_image', 'VARCHAR(255) NULL AFTER selfie_image');
CALL AddColumnIfNotExists('paylater_applications', 'slip_gaji_image', 'VARCHAR(255) NULL AFTER kk_image');
CALL AddColumnIfNotExists('paylater_applications', 'npwp_image', 'VARCHAR(255) NULL AFTER slip_gaji_image');
CALL AddColumnIfNotExists('paylater_applications', 'bpjs_image', 'VARCHAR(255) NULL AFTER npwp_image');
CALL AddColumnIfNotExists('paylater_applications', 'ijazah_image', 'VARCHAR(255) NULL AFTER bpjs_image');
CALL AddColumnIfNotExists('paylater_applications', 'passport_image', 'VARCHAR(255) NULL AFTER ijazah_image');

-- Bersihkan procedure temporary
DROP PROCEDURE IF EXISTS AddColumnIfNotExists;

-- -------------------------------------------------------------------
-- 3. Tabel Promos & App Settings (jika belum ada di database lama)
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS promos (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value TEXT NOT NULL,
  description VARCHAR(255) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

