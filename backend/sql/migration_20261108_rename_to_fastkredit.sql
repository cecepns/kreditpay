-- ========================================================
-- Migrasi: Pembaruan Nama Aplikasi Menjadi Fastkredit
-- Keterangan:
-- 1. Mengubah nama aplikasi dan perusahaan di tabel app_settings
-- 2. Mengubah prefix nomor surat persetujuan menjadi FK/APP
-- 3. Memperbarui isi notifikasi sistem lama yang menyebut KreditPay
-- ========================================================

-- 1. Perbarui data app_settings
UPDATE app_settings 
SET setting_value = 'Fastkredit' 
WHERE setting_key = 'app_name';

UPDATE app_settings 
SET setting_value = 'PT FASTKREDIT INDONESIA' 
WHERE setting_key = 'letter_company_name';

UPDATE app_settings 
SET setting_value = 'support@fastkredit.com' 
WHERE setting_key = 'cs_email';

UPDATE app_settings 
SET setting_value = 'FK/APP' 
WHERE setting_key = 'letter_number_prefix' AND setting_value = 'KP/APP';

UPDATE app_settings 
SET setting_value = REPLACE(setting_value, 'KreditPay', 'Fastkredit')
WHERE setting_value LIKE '%KreditPay%';

UPDATE app_settings 
SET setting_value = REPLACE(setting_value, 'KREDITPAY', 'FASTKREDIT')
WHERE setting_value LIKE '%KREDITPAY%';

UPDATE app_settings 
SET setting_value = REPLACE(setting_value, 'kreditpay', 'fastkredit')
WHERE setting_value LIKE '%kreditpay%';

-- 2. Perbarui teks notifikasi pengguna
UPDATE notifications 
SET body = REPLACE(body, 'KreditPay', 'Fastkredit')
WHERE body LIKE '%KreditPay%';

UPDATE notifications 
SET body = REPLACE(body, 'Kreditpay', 'Fastkredit')
WHERE body LIKE '%Kreditpay%';

