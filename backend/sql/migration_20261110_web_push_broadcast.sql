-- ===================================================================
-- MIGRATION SCRIPT: Native Web Push Notifications & Broadcast Targeting
-- Tanggal: 2026-11-10
-- Jalankan di phpMyAdmin pada database kreditpay aktif
-- ===================================================================

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

-- 1. Tambah kolom broadcast channel, target_type, click_url & statistik pengiriman push pada tabel notifications
CALL AddColumnIfNotExists('notifications', 'user_id', 'INT NULL AFTER id');
CALL AddColumnIfNotExists('notifications', 'channel', "ENUM('web','push','both') NOT NULL DEFAULT 'web' AFTER body");
CALL AddColumnIfNotExists('notifications', 'target_type', "ENUM('all','single','multiple') NOT NULL DEFAULT 'all' AFTER channel");
CALL AddColumnIfNotExists('notifications', 'click_url', "VARCHAR(255) NULL DEFAULT '/app/notifikasi' AFTER target_type");
CALL AddColumnIfNotExists('notifications', 'push_sent', 'INT NOT NULL DEFAULT 0 AFTER click_url');
CALL AddColumnIfNotExists('notifications', 'push_failed', 'INT NOT NULL DEFAULT 0 AFTER push_sent');

CALL AddIndexIfNotExists('notifications', 'idx_notif_user', 'user_id');
CALL AddIndexIfNotExists('notifications', 'idx_notif_channel', 'channel');
CALL AddIndexIfNotExists('notifications', 'idx_notif_target', 'target_type');

-- 2. Backfill notifikasi personal lama agar target_type = 'single'
UPDATE notifications
SET target_type = 'single'
WHERE user_id IS NOT NULL AND target_type = 'all';

-- 3. Tabel target penerima untuk broadcast ke beberapa user sekaligus (target_type = 'multiple')
CREATE TABLE IF NOT EXISTS notification_targets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  notification_id INT NOT NULL,
  user_id INT NOT NULL,
  UNIQUE KEY uniq_notif_user (notification_id, user_id),
  INDEX idx_nt_user (user_id),
  CONSTRAINT fk_nt_notif FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
  CONSTRAINT fk_nt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Tabel perangkat langganan Native Web Push (VAPID)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  endpoint VARCHAR(500) NOT NULL,
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  user_agent VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_push_endpoint (endpoint(255)),
  INDEX idx_push_user (user_id),
  CONSTRAINT fk_push_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. Bersihkan Stored Procedure sementara
DROP PROCEDURE IF EXISTS AddColumnIfNotExists;
DROP PROCEDURE IF EXISTS AddIndexIfNotExists;

SELECT 'Migration 20261110_web_push_broadcast berhasil dijalankan!' AS status;

