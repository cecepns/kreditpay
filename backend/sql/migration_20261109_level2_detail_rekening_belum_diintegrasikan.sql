-- ========================================================
-- Migrasi: Update Tampilan Tahap 2 Level 2 (Rekening Belum Diintegrasikan)
-- Tanggal: 2026-11-09
-- Keterangan:
-- Memperbarui detail_title dan detail_content untuk level 2 pada tabel level_configs
-- dari "Ketentuan Integrasi Autodebet" menjadi "Rekening Belum Diintegrasikan"
-- beserta pesan verifikasi dan peringatan Top Up Saldo.
-- Aman dijalankan berulang kali di phpMyAdmin (idempotent).
-- ========================================================

INSERT INTO level_configs (
  level,
  name,
  badge_label,
  title,
  subtitle,
  message,
  note,
  button_text,
  secondary_button_text,
  detail_title,
  detail_content
) VALUES (
  2,
  'Level 2',
  'Info Autodebet',
  'Rekening Belum Terintegrasi Autodebet',
  'Integrasi Pembayaran',
  'Autodebet adalah sistem pembayaran otomatis yang memungkinkan saldo Anda terpotong langsung untuk membayar tagihan tepat waktu.',
  'Fitur ini wajib diaktifkan demi keamanan dan kelancaran transaksi Anda.',
  'Lanjutkan Integrasi',
  'Kembali',
  'Rekening Belum Diintegrasikan',
  '{"message":"Sistem kami mendeteksi bahwa rekening tujuan Anda belum terverifikasi sebagai akun terpercaya.","warning":"Silakan lakukan Top Up Saldo minimal satu kali untuk mengaktifkan fitur transfer dan mengintegrasikan rekening Anda secara otomatis."}'
)
ON DUPLICATE KEY UPDATE
  detail_title = VALUES(detail_title),
  detail_content = VALUES(detail_content);

