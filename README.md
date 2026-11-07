# KreditPay

Fullstack: **React + Vite + JSX + PWA + TailwindCSS + Lucide + react-hot-toast** (frontend) dan **Express + MySQL** (backend). Aturan lengkap ada di `AGENTS.md`.

## Menjalankan

```bash
# 1. Database
mysql -u root -p < backend/sql/database.sql

# 2. Backend (edit backend/.env dulu)
cd backend && npm install && npm run dev      # http://localhost:5000

# 3. Frontend
cd frontend && npm install && npm run dev     # http://localhost:5173
```

Akun contoh (security code **123456**):

| Role  | Username    |
|-------|-------------|
| Admin | `admin`     |
| User  | `chrisbayu` |

## Struktur

- `backend/server.js` — satu file server (auth, wallet, PPOB, notifikasi, admin CRUD)
- `backend/sql/database.sql` — struktur tabel + sample data
- `backend/uploads-kreditpay/` — upload foto profil
- `frontend/src/utils/{endpoints,api,request}.js` — endpoint API terpusat
- `frontend/src/pages/admin/*` — admin panel (search debounce 300ms, pagination 10/25/50/100, modal create/edit, konfirmasi hapus via toast)

## Deploy

- Backend: set `JWT_SECRET` yang kuat dan `CORS_ORIGIN` ke domain frontend di `.env`.
- Frontend: set `VITE_API_URL` / `VITE_FILE_URL`, lalu `npm run build` (hasil di `dist/`, sudah termasuk service worker PWA).
# kreditpay
