-- Migration: Penambahan Konfigurasi Template Surat Persetujuan Pinjaman
-- Tanggal: 07 November 2026

INSERT INTO app_settings (setting_key, setting_value, description) VALUES
('letter_company_name', 'PT KREDITPAY INDONESIA', 'Nama Perusahaan pada Surat Persetujuan'),
('letter_title', 'SURAT PEMBERITAHUAN\nPERSETUJUAN PENGAJUAN PINJAMAN', 'Judul Surat Persetujuan'),
('letter_number_prefix', 'KP/APP', 'Awalan / Prefix Nomor Surat Resmi'),
('letter_opening', 'Berdasarkan hasil proses evaluasi dan verifikasi terhadap pengajuan pinjaman yang Anda ajukan melalui {company_name}, dengan ini kami memberitahukan bahwa pengajuan pinjaman Anda telah DISETUJUI, dengan rincian sebagai berikut:', 'Paragraf Pembuka Surat Persetujuan'),
('letter_rules_min_topup', 'Rp 1.000.000 (satu juta rupiah)', 'Nominal Minimal Top-up Syarat Pencairan'),
('letter_rules_content', '- Silakan refresh saldo PayLater Anda\n- Tanda akun Anda aktif yaitu adanya logo "Verifikasi" pada akun Anda.\n- Jika ingin melakukan pencairan saldo PayLater.\n- Nasabah diwajibkan isi saldo ke aplikasi agar fitur menu transfer dan menu-menu lainnya dapat diakses minimal:\n[TOPUP_HIGHLIGHT]\n- Dana top-up nasabah dikirim ke rekening perusahaan sesuai dengan nomor ID akun pemohon.\n- Top-up atau isi saldo ini digunakan untuk membuka dan mengakses menu serta fitur yang ada dalam aplikasi kami.\n- Top-up atau isi saldo ini akan dicairkan bersamaan dengan pencairan PayLater Anda nantinya. "Hanya bersifat sementara". Top-up ini hanya untuk membuka fitur "Transfer" agar limit PayLater Anda bisa dicairkan ke rekening melalui menu transfer.', 'Daftar Aturan Pencairan Limit Pinjaman'),
('letter_closing', 'Demikian surat pemberitahuan ini kami sampaikan. Terima kasih atas kepercayaan Anda kepada {company_name}.', 'Paragraf Penutup Surat Persetujuan'),
('letter_signer', 'Tim Operasional', 'Pihak Penandatangan Surat Resmi'),
('letter_important_notes', 'Jaga kerahasiaan akun dan data pribadi Anda. {company_name} tidak meminta PIN, OTP, atau Password kepada siapapun melalui media lainnya.', 'Catatan Informasi Penting Kaki Surat')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

