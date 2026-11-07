-- Migration: Penambahan Setting Pilihan Model Desain Surat Persetujuan Pinjaman
-- Tanggal: 07 November 2026

INSERT INTO app_settings (setting_key, setting_value, description) VALUES
('letter_layout_model', 'model_1', 'Pilihan Model Desain Surat: model_1 (Modern FinTech), model_2 (Formal Perbankan), model_3 (Sertifikat SKPK), model_reference (Model Referensi Asli)')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

