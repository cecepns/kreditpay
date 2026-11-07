-- ===================================================================
-- MIGRATION SCRIPT: User Notifications & Level Schema Updates
-- Tanggal: 2026-11-07
-- Database: kreditpay
-- Deskripsi:
-- 1. Menambahkan kolom user_id pada tabel notifications agar notifikasi
--    bisa dikirim secara personal ke user tertentu (contoh: ACC Pinjaman).
-- 2. Menambahkan kolom level pada tabel users jika belum ada.
-- 3. Menambahkan kolom proof pada tabel transactions jika belum ada.
-- 4. Mengubah kolom title pada level_configs menjadi TEXT agar muat format HTML.
-- 5. Menambahkan relasi Foreign Key fk_notif_user ke tabel users.
-- ===================================================================

USE kreditpay;

-- Stored procedure untuk penambahan kolom yang aman & idempotent
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

DROP PROCEDURE IF EXISTS AddIndexIfNotExists $$
CREATE PROCEDURE AddIndexIfNotExists(
    IN tableName VARCHAR(64),
    IN indexName VARCHAR(64),
    IN indexCols TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = tableName 
          AND INDEX_NAME = indexName
    ) THEN
        SET @sqlStatement = CONCAT('ALTER TABLE ', tableName, ' ADD INDEX ', indexName, ' (', indexCols, ')');
        PREPARE stmt FROM @sqlStatement;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END $$

DELIMITER ;

-- -------------------------------------------------------------------
-- 1. Tabel users: pastikan kolom level ada (default 1)
-- -------------------------------------------------------------------
CALL AddColumnIfNotExists('users', 'level', 'INT NOT NULL DEFAULT 1 AFTER role');

-- -------------------------------------------------------------------
-- 2. Tabel notifications: tambahkan user_id (NULL = broadcast, INT = personal)
-- -------------------------------------------------------------------
CALL AddColumnIfNotExists('notifications', 'user_id', 'INT NULL AFTER id');
CALL AddIndexIfNotExists('notifications', 'idx_notif_user', 'user_id');

-- Tambahkan Foreign Key jika belum ada
SET @fk_exists = (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'notifications'
      AND CONSTRAINT_NAME = 'fk_notif_user'
);
SET @sql_fk = IF(@fk_exists = 0, 'ALTER TABLE notifications ADD CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE', 'SELECT "Foreign key fk_notif_user already exists"');
PREPARE stmt_fk FROM @sql_fk;
EXECUTE stmt_fk;
DEALLOCATE PREPARE stmt_fk;

-- -------------------------------------------------------------------
-- 3. Tabel transactions: pastikan kolom proof ada (bukti struk/topup)
-- -------------------------------------------------------------------
CALL AddColumnIfNotExists('transactions', 'proof', 'VARCHAR(255) NULL AFTER target');

-- -------------------------------------------------------------------
-- 4. Tabel level_configs: perbesar tipe kolom title menjadi TEXT
-- -------------------------------------------------------------------
ALTER TABLE level_configs MODIFY COLUMN title TEXT NOT NULL;

-- -------------------------------------------------------------------
-- 5. Bersihkan Stored Procedure Sementara
-- -------------------------------------------------------------------
DROP PROCEDURE IF EXISTS AddColumnIfNotExists;
DROP PROCEDURE IF EXISTS AddIndexIfNotExists;

SELECT 'Migration 20261107_user_notifications_and_levels berhasil dijalankan!' AS status;

