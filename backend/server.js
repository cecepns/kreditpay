require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const PORT = process.env.PORT || 5000;
const UPLOAD_DIR = path.join(__dirname, "uploads-kreditpay");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "kreditpay",
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
});

/* ───────────── Helpers ───────────── */
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const ok = (res, data, extra = {}, status = 200) => res.status(status).json({ success: true, data, ...extra });
const fail = (res, status, message) => res.status(status).json({ success: false, message });
const wrap = (fn) => async (req, res, next) => {
  try { await fn(req, res); } catch (e) { next(e); }
};
const clean = (v, max = 255) => String(v ?? "").replace(/<[^>]*>/g, "").trim().slice(0, max);
const cleanHtml = (v, max = 5000) => String(v ?? "").trim().slice(0, max);
const amountOf = (v) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : 0; };
const money = (v) => Math.max(0, Number(v) || 0);
const normPhone = (p) => String(p).replace(/[\s-]/g, "").replace(/^(\+62|62)/, "0");
const makeRef = () => "KP" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();

const rules = {
  password: (v) => typeof v === "string" && v.length >= 6,
  pin: (v) => typeof v === "string" && v.length >= 6,
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  phone: (v) => /^08\d{8,12}$/.test(v),
  username: (v) => /^[a-z0-9_.]{4,30}$/.test(v),
};

const USER_FIELDS = "id,name,username,email,phone,role,level,avatar,balance,paylater_limit,paylater_used,created_at";
const findUser = async (id) => (await db.query(`SELECT ${USER_FIELDS} FROM users WHERE id=?`, [id]))[0][0];
const sign = (u) => jwt.sign({ id: u.id, role: u.role }, process.env.JWT_SECRET || "kreditpay-fallback-secret-2026", { expiresIn: "7d" });

async function withTx(fn) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

const INSERT_TX = "INSERT INTO transactions (user_id,type,title,amount,source,target,reference) VALUES (?,?,?,?,?,?,?)";

function parseUser(b, { pinRequired }) {
  const d = {
    name: clean(b.name, 100),
    username: clean(b.username, 30).toLowerCase(),
    email: clean(b.email, 120).toLowerCase(),
    phone: normPhone(clean(b.phone, 20)),
  };
  if (d.name.length < 3) return { error: "Nama minimal 3 karakter" };
  if (!rules.username(d.username)) return { error: "Username 4-30 karakter: huruf kecil, angka, titik atau underscore" };
  if (!rules.email(d.email)) return { error: "Format email tidak valid" };
  if (!rules.phone(d.phone)) return { error: "No HP tidak valid (contoh: 081234567890)" };
  const rawPass = b.password ?? b.pin;
  if (pinRequired || rawPass) {
    const pStr = String(rawPass || "");
    if (!rules.password(pStr)) return { error: "Password minimal 6 karakter" };
    d.pin = pStr;
  }
  return { data: d };
}

/* Pagination + search + sorting + filter untuk semua endpoint GET list */
async function paginate(req, res, { from, select, searchCols = [], sortable, defaultSort, filters = {}, baseWhere = [], baseParams = [] }) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = [10, 25, 50, 100].includes(parseInt(req.query.limit)) ? parseInt(req.query.limit) : 10;
  const where = [...baseWhere];
  const params = [...baseParams];

  const search = clean(req.query.search, 100);
  if (search && searchCols.length) {
    where.push("(" + searchCols.map((c) => `${c} LIKE ?`).join(" OR ") + ")");
    searchCols.forEach(() => params.push(`%${search}%`));
  }
  for (const [key, col] of Object.entries(filters)) {
    if (req.query[key]) { where.push(`${col} = ?`); params.push(String(req.query[key])); }
  }

  const sortCol = sortable[req.query.sortBy] || sortable[defaultSort];
  const order = String(req.query.order).toLowerCase() === "asc" ? "ASC" : "DESC";
  const w = where.length ? "WHERE " + where.join(" AND ") : "";

  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM ${from} ${w}`, params);
  const [rows] = await db.query(`SELECT ${select} FROM ${from} ${w} ORDER BY ${sortCol} ${order} LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
  res.json({ success: true, data: rows, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
}

const auth = (roles) => (req, res, next) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  try { req.user = jwt.verify(token, process.env.JWT_SECRET || "kreditpay-fallback-secret-2026"); }
  catch { return fail(res, 401, "Sesi berakhir, silakan masuk kembali"); }
  if (roles && !roles.includes(req.user.role)) return fail(res, 403, "Akses ditolak");
  next();
};
const userOnly = auth();
const adminOnly = auth(["admin"]);

const MIME_EXT = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, `avatar-${req.user.id}-${Date.now()}${MIME_EXT[file.mimetype]}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => (MIME_EXT[file.mimetype] ? cb(null, true) : cb(new Error("INVALID_FILE"))),
});

const uploadProof = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, `proof-${req.user.id}-${Date.now()}${MIME_EXT[file.mimetype]}`),
  }),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => (MIME_EXT[file.mimetype] ? cb(null, true) : cb(new Error("INVALID_FILE"))),
});

const uploadDocs = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, `doc-${req.user.id}-${file.fieldname}-${Date.now()}${MIME_EXT[file.mimetype]}`),
  }),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => (MIME_EXT[file.mimetype] ? cb(null, true) : cb(new Error("INVALID_FILE"))),
});

const uploadChat = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, `chat-${req.user.id}-${Date.now()}${MIME_EXT[file.mimetype] || ".jpg"}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => (MIME_EXT[file.mimetype] ? cb(null, true) : cb(new Error("INVALID_FILE"))),
});

/* ───────────── App ───────────── */
const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true }));
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(UPLOAD_DIR));

app.get("/api/health", (req, res) => ok(res, { status: "up" }));

/* ── Auth ── */
app.post("/api/auth/register", wrap(async (req, res) => {
  const { error, data } = parseUser(req.body, { pinRequired: true });
  if (error) return fail(res, 400, error);
  const hash = await bcrypt.hash(data.pin, 10);
  const [r] = await db.query(
    "INSERT INTO users (name,username,email,phone,pin_hash,paylater_limit) VALUES (?,?,?,?,?,5000000)",
    [data.name, data.username, data.email, data.phone, hash]
  );
  const user = await findUser(r.insertId);
  ok(res, { token: sign(user), user }, { message: "Pendaftaran berhasil" }, 201);
}));

app.post("/api/auth/login", wrap(async (req, res) => {
  const identifier = clean(req.body.identifier, 120).toLowerCase();
  const password = String(req.body.password ?? req.body.pin ?? "");
  if (!identifier || !password) return fail(res, 400, "Isi akun dan password");
  const [[row]] = await db.query("SELECT id,pin_hash FROM users WHERE username=? OR email=? OR phone=? LIMIT 1", [identifier, identifier, normPhone(identifier)]);
  if (!row || !(await bcrypt.compare(password, row.pin_hash))) return fail(res, 401, "Akun atau password salah");
  const user = await findUser(row.id);
  ok(res, { token: sign(user), user }, { message: "Berhasil masuk" });
}));

app.get("/api/auth/profile", userOnly, wrap(async (req, res) => {
  const user = await findUser(req.user.id);
  if (!user) return fail(res, 401, "Akun tidak ditemukan");
  ok(res, user);
}));

app.post("/api/auth/avatar", userOnly, upload.single("avatar"), wrap(async (req, res) => {
  if (!req.file) return fail(res, 400, "Pilih gambar terlebih dahulu");
  await db.query("UPDATE users SET avatar=? WHERE id=?", [`/uploads/${req.file.filename}`, req.user.id]);
  ok(res, await findUser(req.user.id), { message: "Foto profil diperbarui" });
}));

/* ── Dashboard ── */
app.get("/api/dashboard", userOnly, wrap(async (req, res) => {
  const user = await findUser(req.user.id);
  if (!user) return fail(res, 401, "Akun tidak ditemukan");
  const [[{ total }]] = await db.query("SELECT COUNT(*) AS total FROM notifications");
  ok(res, {
    balance: user.balance,
    paylater: { limit: user.paylater_limit, used: user.paylater_used, available: user.paylater_limit - user.paylater_used },
    notifications: total,
  });
}));

/* ── Wallet ── */
app.post("/api/wallet/topup", userOnly, uploadProof.single("proof"), wrap(async (req, res) => {
  const amount = amountOf(req.body.amount);
  if (amount < 10000 || amount > 50000000) return fail(res, 400, "Nominal top up Rp10.000 - Rp50.000.000");

  let bankLabel = null;
  if (req.body.bank_id) {
    const [[bank]] = await db.query("SELECT * FROM bank_accounts WHERE id=?", [req.body.bank_id]);
    if (bank) {
      bankLabel = `${bank.bank_name} - ${bank.account_number} (${bank.account_name})`;
    }
  } else if (req.body.bank_name) {
    bankLabel = `${clean(req.body.bank_name, 50)} - ${clean(req.body.account_number, 50)}`;
  }

  const reference = clean(req.body.reference, 40) || ("USR" + Math.floor(1000000000 + Math.random() * 9000000000));
  const bankName = clean(req.body.bank_name, 50);
  const title = bankName ? `Top Up Saldo - ${bankName}` : "Top Up Saldo";
  const proof = req.file ? `/uploads/${req.file.filename}` : null;
  const status = proof ? "pending" : "success";

  await withTx(async (c) => {
    if (status === "success") {
      await c.query("UPDATE users SET balance=balance+? WHERE id=?", [amount, req.user.id]);
    }
    await c.query(
      "INSERT INTO transactions (user_id,type,title,amount,source,target,reference,status,proof) VALUES (?,?,?,?,?,?,?,?,?)",
      [req.user.id, "topup", title, amount, "balance", bankLabel, reference, status, proof]
    );
  });

  const message = proof
    ? "Bukti pembayaran berhasil diunggah! Menunggu verifikasi admin."
    : "Top up berhasil diproses";

  ok(res, { amount, reference, proof, status }, { message });
}));

/* ── Bank Accounts (User) ── */
app.get("/api/banks", userOnly, wrap(async (req, res) => {
  const [rows] = await db.query("SELECT id, bank_name, account_number, account_name FROM bank_accounts WHERE is_active=1 ORDER BY id ASC");
  ok(res, rows);
}));

/* ── Level Configs (User & Admin) ── */
app.get("/api/levels", userOnly, wrap(async (req, res) => {
  const [rows] = await db.query("SELECT * FROM level_configs ORDER BY level ASC");
  ok(res, rows);
}));

app.put("/api/admin/levels/:level", adminOnly, wrap(async (req, res) => {
  const level = parseInt(req.params.level);
  if (![1, 2, 3, 4, 5, 6, 7].includes(level)) return fail(res, 400, "Level tidak valid");

  const title = cleanHtml(req.body.title, 1000);
  const subtitle = cleanHtml(req.body.subtitle, 500);
  const message = cleanHtml(req.body.message, 3000);
  const note = cleanHtml(req.body.note, 3000);
  const button_text = cleanHtml(req.body.button_text, 200);
  const secondary_button_text = cleanHtml(req.body.secondary_button_text, 200);
  const detail_title = cleanHtml(req.body.detail_title, 500);
  const detail_content = cleanHtml(
    typeof req.body.detail_content === "object"
      ? JSON.stringify(req.body.detail_content)
      : req.body.detail_content,
    5000
  );

  if (!title) return fail(res, 400, "Judul tidak boleh kosong");
  if (!message) return fail(res, 400, "Pesan tidak boleh kosong");

  await db.query(
    `UPDATE level_configs SET 
      title=?, subtitle=?, message=?, note=?, button_text=?, 
      secondary_button_text=?, detail_title=?, detail_content=?
     WHERE level=?`,
    [title, subtitle, message, note, button_text, secondary_button_text, detail_title, detail_content, level]
  );

  const [[updated]] = await db.query("SELECT * FROM level_configs WHERE level=?", [level]);
  ok(res, updated, { message: `Pengaturan Level ${level} berhasil diperbarui` });
}));

app.post("/api/wallet/transfer", userOnly, wrap(async (req, res) => {
  const to = clean(req.body.to, 30).toLowerCase();
  const amount = amountOf(req.body.amount);
  if (!to) return fail(res, 400, "Isi username atau No HP penerima");
  if (amount < 10000) return fail(res, 400, "Minimal transfer Rp10.000");
  await withTx(async (c) => {
    const [[sender]] = await c.query("SELECT id,name,balance FROM users WHERE id=? FOR UPDATE", [req.user.id]);
    const [[rcv]] = await c.query("SELECT id,name FROM users WHERE username=? OR phone=? LIMIT 1", [to, normPhone(to)]);
    if (!rcv) throw new HttpError(404, "Penerima tidak ditemukan");
    if (rcv.id === sender.id) throw new HttpError(400, "Tidak bisa transfer ke akun sendiri");
    if (sender.balance < amount) throw new HttpError(400, "Saldo utama tidak cukup");
    const reference = makeRef();
    await c.query("UPDATE users SET balance=balance-? WHERE id=?", [amount, sender.id]);
    await c.query("UPDATE users SET balance=balance+? WHERE id=?", [amount, rcv.id]);
    await c.query(INSERT_TX, [sender.id, "transfer_out", `Transfer ke ${rcv.name}`, amount, "balance", to, reference]);
    await c.query(INSERT_TX, [rcv.id, "transfer_in", `Transfer dari ${sender.name}`, amount, "balance", null, reference]);
  });
  ok(res, { amount }, { message: "Transfer berhasil" });
}));

/* ── PPOB (Pulsa, Internet, PLN, dst) ── */
const SERVICES = { pulsa: "Pulsa", internet: "Internet", pln: "PLN", pdam: "PDAM", games: "Games", bpjs: "BPJS", tvkabel: "TV Kabel", lainnya: "Lainnya" };

app.post("/api/ppob/pay", userOnly, wrap(async (req, res) => {
  const service = clean(req.body.service, 20);
  const target = clean(req.body.target, 30);
  const amount = amountOf(req.body.amount);
  const source = req.body.source === "paylater" ? "paylater" : "balance";
  if (!SERVICES[service]) return fail(res, 400, "Layanan tidak dikenal");
  if (target.length < 4) return fail(res, 400, "Isi nomor tujuan / ID pelanggan");
  if (amount < 5000 || amount > 5000000) return fail(res, 400, "Nominal Rp5.000 - Rp5.000.000");
  await withTx(async (c) => {
    const [[u]] = await c.query("SELECT balance,paylater_limit,paylater_used FROM users WHERE id=? FOR UPDATE", [req.user.id]);
    if (source === "balance") {
      if (u.balance < amount) throw new HttpError(400, "Saldo utama tidak cukup");
      await c.query("UPDATE users SET balance=balance-? WHERE id=?", [amount, req.user.id]);
    } else {
      if (u.paylater_limit - u.paylater_used < amount) throw new HttpError(400, "Limit PayLater tidak cukup");
      await c.query("UPDATE users SET paylater_used=paylater_used+? WHERE id=?", [amount, req.user.id]);
    }
    await c.query(INSERT_TX, [req.user.id, "ppob", `${SERVICES[service]} - ${target}`, amount, source, target, makeRef()]);
  });
  ok(res, { amount }, { message: `Pembayaran ${SERVICES[service]} berhasil` });
}));

/* ── PayLater Applications (User & Admin) ── */
app.get("/api/paylater/status", userOnly, wrap(async (req, res) => {
  const [[appRow]] = await db.query(
    "SELECT * FROM paylater_applications WHERE user_id=? ORDER BY id DESC LIMIT 1",
    [req.user.id]
  );
  ok(res, appRow || null);
}));

app.post(
  "/api/paylater/apply",
  userOnly,
  uploadDocs.fields([
    { name: "ktp", maxCount: 1 },
    { name: "ktp_back", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
    { name: "kk", maxCount: 1 },
    { name: "slip_gaji", maxCount: 1 },
    { name: "npwp", maxCount: 1 },
    { name: "bpjs", maxCount: 1 },
    { name: "ijazah", maxCount: 1 },
    { name: "passport", maxCount: 1 },
  ]),
  wrap(async (req, res) => {
    const full_name = clean(req.body.full_name, 100);
    const nik = clean(req.body.nik, 20);
    const birth_place = clean(req.body.birth_place, 100);
    const birth_date = clean(req.body.birth_date, 30);
    const mother_name = clean(req.body.mother_name, 100) || "-";
    const ktp_address = clean(req.body.ktp_address, 255);
    const ktp_province = clean(req.body.ktp_province, 100);
    const ktp_city = clean(req.body.ktp_city, 100);
    const ktp_district = clean(req.body.ktp_district, 100);
    const ktp_village = clean(req.body.ktp_village, 100);
    const domicile_address = clean(req.body.domicile_address, 255);
    const domicile_province = clean(req.body.domicile_province, 100);
    const domicile_city = clean(req.body.domicile_city, 100);
    const domicile_district = clean(req.body.domicile_district, 100);
    const domicile_village = clean(req.body.domicile_village, 100);
    const residence_years = clean(req.body.residence_years, 50);
    const emergency_name = clean(req.body.emergency_name, 100);
    const emergency_relation = clean(req.body.emergency_relation, 50);
    const emergency_phone = clean(req.body.emergency_phone, 20);
    const emergency_address = clean(req.body.emergency_address, 255);
    const job_type = clean(req.body.job_type, 100) || "Karyawan";
    const company_name = clean(req.body.company_name, 100) || "-";
    const monthly_income = amountOf(req.body.monthly_income);

    // Simulasi Pinjaman PayLater
    const requested_amount = amountOf(req.body.requested_amount);
    const requested_tenor = parseInt(req.body.requested_tenor) || 12;
    const monthly_installment =
      amountOf(req.body.monthly_installment) ||
      (requested_amount > 0
        ? Math.round((requested_amount * (1 + 0.02 * (requested_tenor / 12))) / requested_tenor)
        : 0);

    if (!nik || nik.length < 16) return fail(res, 400, "NIK harus minimal 16 digit");
    if (!birth_date) return fail(res, 400, "Tanggal lahir harus diisi");

    const ktp_image = req.files?.ktp?.[0] ? `/uploads/${req.files.ktp[0].filename}` : null;
    const ktp_back_image = req.files?.ktp_back?.[0] ? `/uploads/${req.files.ktp_back[0].filename}` : null;
    const selfie_image = req.files?.selfie?.[0] ? `/uploads/${req.files.selfie[0].filename}` : null;

    // Dokumen Pendukung (Data Tambahan)
    const kk_image = req.files?.kk?.[0] ? `/uploads/${req.files.kk[0].filename}` : null;
    const slip_gaji_image = req.files?.slip_gaji?.[0] ? `/uploads/${req.files.slip_gaji[0].filename}` : null;
    const npwp_image = req.files?.npwp?.[0] ? `/uploads/${req.files.npwp[0].filename}` : null;
    const bpjs_image = req.files?.bpjs?.[0] ? `/uploads/${req.files.bpjs[0].filename}` : null;
    const ijazah_image = req.files?.ijazah?.[0] ? `/uploads/${req.files.ijazah[0].filename}` : null;
    const passport_image = req.files?.passport?.[0] ? `/uploads/${req.files.passport[0].filename}` : null;

    const [r] = await db.query(
      `INSERT INTO paylater_applications 
       (user_id, requested_amount, requested_tenor, monthly_installment,
        full_name, nik, birth_place, birth_date, mother_name,
        ktp_address, ktp_province, ktp_city, ktp_district, ktp_village,
        domicile_address, domicile_province, domicile_city, domicile_district, domicile_village, residence_years,
        emergency_name, emergency_relation, emergency_phone, emergency_address,
        job_type, company_name, monthly_income,
        ktp_image, ktp_back_image, selfie_image,
        kk_image, slip_gaji_image, npwp_image, bpjs_image, ijazah_image, passport_image,
        status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        req.user.id,
        requested_amount,
        requested_tenor,
        monthly_installment,
        full_name,
        nik,
        birth_place,
        birth_date,
        mother_name,
        ktp_address,
        ktp_province,
        ktp_city,
        ktp_district,
        ktp_village,
        domicile_address,
        domicile_province,
        domicile_city,
        domicile_district,
        domicile_village,
        residence_years,
        emergency_name,
        emergency_relation,
        emergency_phone,
        emergency_address,
        job_type,
        company_name,
        monthly_income,
        ktp_image,
        ktp_back_image,
        selfie_image,
        kk_image,
        slip_gaji_image,
        npwp_image,
        bpjs_image,
        ijazah_image,
        passport_image,
      ]
    );

    const [[created]] = await db.query("SELECT * FROM paylater_applications WHERE id=?", [r.insertId]);
    ok(res, created, { message: "Pengajuan aktivasi PayLater berhasil dikirim!" });
  })
);

app.get("/api/admin/paylater", adminOnly, wrap((req, res) =>
  paginate(req, res, {
    from: "paylater_applications pa JOIN users u ON u.id = pa.user_id",
    select: "pa.*, u.username, u.name as user_name, u.email as user_email, u.phone as user_phone, u.paylater_limit",
    searchCols: ["pa.nik", "u.name", "u.username", "pa.company_name"],
    sortable: { created_at: "pa.created_at", id: "pa.id" },
    defaultSort: "created_at",
    filters: { status: "pa.status" },
  })
));

app.put("/api/admin/paylater/:id/status", adminOnly, wrap(async (req, res) => {
  const status = clean(req.body.status, 20);
  const limitAmount = amountOf(req.body.limit) || 50000000;
  if (!["approved", "rejected", "pending"].includes(status)) return fail(res, 400, "Status tidak valid");

  await withTx(async (c) => {
    const [[appRow]] = await c.query("SELECT * FROM paylater_applications WHERE id=? FOR UPDATE", [req.params.id]);
    if (!appRow) throw new HttpError(404, "Pengajuan tidak ditemukan");

    await c.query("UPDATE paylater_applications SET status=? WHERE id=?", [status, req.params.id]);
    if (status === "approved") {
      await c.query("UPDATE users SET paylater_limit=? WHERE id=?", [limitAmount, appRow.user_id]);
    }
  });

  ok(res, null, { message: `Pengajuan PayLater berhasil diubah ke status: ${status}` });
}));

// Admin: Bulk Approve (ACC Semua / Terpilih)
app.post("/api/admin/paylater/bulk-approve", adminOnly, wrap(async (req, res) => {
  const { ids, all_pending, default_limit } = req.body || {};
  const fallbackLimit = amountOf(default_limit) || 50000000;

  let applications = [];
  if (all_pending) {
    const [rows] = await db.query(
      "SELECT id, user_id, requested_amount FROM paylater_applications WHERE status = 'pending'"
    );
    applications = rows;
  } else if (Array.isArray(ids) && ids.length > 0) {
    const cleanIds = ids.map((id) => parseInt(id)).filter(Boolean);
    if (cleanIds.length === 0) return fail(res, 400, "Daftar ID tidak valid");
    const [rows] = await db.query(
      `SELECT id, user_id, requested_amount FROM paylater_applications WHERE id IN (?) AND status = 'pending'`,
      [cleanIds]
    );
    applications = rows;
  } else {
    return fail(res, 400, "Tentukan pengajuan yang akan disetujui");
  }

  if (applications.length === 0) {
    return fail(res, 400, "Tidak ada pengajuan berstatus 'menunggu' yang dapat disetujui");
  }

  await withTx(async (c) => {
    for (const app of applications) {
      const limitToSet = app.requested_amount > 0 ? Number(app.requested_amount) : fallbackLimit;
      await c.query("UPDATE paylater_applications SET status = 'approved' WHERE id = ?", [app.id]);
      await c.query("UPDATE users SET paylater_limit = ? WHERE id = ?", [limitToSet, app.user_id]);
    }
  });

  ok(res, { count: applications.length }, {
    message: `Berhasil menyetujui (ACC) ${applications.length} pengajuan PayLater sekaligus!`,
  });
}));

// Admin: Bulk Reject
app.post("/api/admin/paylater/bulk-reject", adminOnly, wrap(async (req, res) => {
  const { ids, all_pending } = req.body || {};

  let applications = [];
  if (all_pending) {
    const [rows] = await db.query(
      "SELECT id FROM paylater_applications WHERE status = 'pending'"
    );
    applications = rows;
  } else if (Array.isArray(ids) && ids.length > 0) {
    const cleanIds = ids.map((id) => parseInt(id)).filter(Boolean);
    if (cleanIds.length === 0) return fail(res, 400, "Daftar ID tidak valid");
    const [rows] = await db.query(
      `SELECT id FROM paylater_applications WHERE id IN (?) AND status = 'pending'`,
      [cleanIds]
    );
    applications = rows;
  } else {
    return fail(res, 400, "Tentukan pengajuan yang akan ditolak");
  }

  if (applications.length === 0) {
    return fail(res, 400, "Tidak ada pengajuan berstatus 'menunggu' yang dapat ditolak");
  }

  const appIds = applications.map((a) => a.id);
  await db.query("UPDATE paylater_applications SET status = 'rejected' WHERE id IN (?)", [appIds]);

  ok(res, { count: applications.length }, {
    message: `Berhasil menolak ${applications.length} pengajuan PayLater.`,
  });
}));

/* ── Transactions & Notifications (user) ── */
app.get("/api/transactions", userOnly, wrap((req, res) =>
  paginate(req, res, {
    from: "transactions",
    select: "id,type,title,amount,source,status,reference,target,created_at",
    searchCols: ["title", "reference", "target"],
    sortable: { created_at: "created_at", amount: "amount" },
    defaultSort: "created_at",
    filters: { type: "type", status: "status", source: "source" },
    baseWhere: ["user_id = ?"],
    baseParams: [req.user.id],
  })
));

const NOTIF_SORT = { created_at: "created_at", title: "title" };
app.get("/api/notifications", userOnly, wrap((req, res) =>
  paginate(req, res, { from: "notifications", select: "id,title,body,created_at", searchCols: ["title", "body"], sortable: NOTIF_SORT, defaultSort: "created_at" })
));

/* ── Admin: Users ── */
app.get("/api/admin/users", adminOnly, wrap((req, res) =>
  paginate(req, res, {
    from: "users",
    select: USER_FIELDS,
    searchCols: ["name", "username", "email", "phone"],
    sortable: { created_at: "created_at", name: "name", username: "username", balance: "balance" },
    defaultSort: "created_at",
    filters: { role: "role" },
  })
));

const adminUserExtras = (b) => ({
  role: b.role === "admin" ? "admin" : "user",
  level: [1, 2, 3, 4, 5, 6, 7].includes(Number(b.level)) ? Number(b.level) : 1,
  balance: money(b.balance),
  paylater_limit: money(b.paylater_limit),
});

app.post("/api/admin/users", adminOnly, wrap(async (req, res) => {
  const { error, data } = parseUser(req.body, { pinRequired: true });
  if (error) return fail(res, 400, error);
  const x = adminUserExtras(req.body);
  const hash = await bcrypt.hash(data.pin, 10);
  await db.query(
    "INSERT INTO users (name,username,email,phone,pin_hash,role,level,balance,paylater_limit) VALUES (?,?,?,?,?,?,?,?,?)",
    [data.name, data.username, data.email, data.phone, hash, x.role, x.level, x.balance, x.paylater_limit]
  );
  ok(res, null, { message: "Pengguna ditambahkan" }, 201);
}));

app.put("/api/admin/users/:id", adminOnly, wrap(async (req, res) => {
  const { error, data } = parseUser(req.body, { pinRequired: false });
  if (error) return fail(res, 400, error);
  const x = adminUserExtras(req.body);
  const sets = ["name=?", "username=?", "email=?", "phone=?", "role=?", "level=?", "balance=?", "paylater_limit=?"];
  const vals = [data.name, data.username, data.email, data.phone, x.role, x.level, x.balance, x.paylater_limit];
  if (data.pin) { sets.push("pin_hash=?"); vals.push(await bcrypt.hash(data.pin, 10)); }
  const [r] = await db.query(`UPDATE users SET ${sets.join(",")} WHERE id=?`, [...vals, req.params.id]);
  if (!r.affectedRows) return fail(res, 404, "Pengguna tidak ditemukan");
  ok(res, null, { message: "Pengguna diperbarui" });
}));

app.put("/api/admin/users/:id/level", adminOnly, wrap(async (req, res) => {
  const level = Number(req.body.level);
  if (![1, 2, 3, 4, 5, 6, 7].includes(level)) return fail(res, 400, "Level harus antara 1 sampai 7");
  const [r] = await db.query("UPDATE users SET level=? WHERE id=?", [level, req.params.id]);
  if (!r.affectedRows) return fail(res, 404, "Pengguna tidak ditemukan");
  ok(res, null, { message: `Level pengguna berhasil diubah ke Level ${level}` });
}));

app.delete("/api/admin/users/:id", adminOnly, wrap(async (req, res) => {
  if (Number(req.params.id) === req.user.id) return fail(res, 400, "Tidak bisa menghapus akun sendiri");
  const [r] = await db.query("DELETE FROM users WHERE id=?", [req.params.id]);
  if (!r.affectedRows) return fail(res, 404, "Pengguna tidak ditemukan");
  ok(res, null, { message: "Pengguna dihapus" });
}));

/* ── Admin: Notifications ── */
app.get("/api/admin/notifications", adminOnly, wrap((req, res) =>
  paginate(req, res, { from: "notifications", select: "id,title,body,created_at", searchCols: ["title", "body"], sortable: NOTIF_SORT, defaultSort: "created_at" })
));

const parseNotif = (b) => {
  const title = clean(b.title, 150), body = clean(b.body, 2000);
  if (title.length < 3) return { error: "Judul minimal 3 karakter" };
  if (body.length < 3) return { error: "Isi pesan minimal 3 karakter" };
  return { title, body };
};

app.post("/api/admin/notifications", adminOnly, wrap(async (req, res) => {
  const n = parseNotif(req.body);
  if (n.error) return fail(res, 400, n.error);
  await db.query("INSERT INTO notifications (title,body) VALUES (?,?)", [n.title, n.body]);
  ok(res, null, { message: "Notifikasi dikirim ke semua pengguna" }, 201);
}));

app.put("/api/admin/notifications/:id", adminOnly, wrap(async (req, res) => {
  const n = parseNotif(req.body);
  if (n.error) return fail(res, 400, n.error);
  const [r] = await db.query("UPDATE notifications SET title=?, body=? WHERE id=?", [n.title, n.body, req.params.id]);
  if (!r.affectedRows) return fail(res, 404, "Notifikasi tidak ditemukan");
  ok(res, null, { message: "Notifikasi diperbarui" });
}));

app.delete("/api/admin/notifications/:id", adminOnly, wrap(async (req, res) => {
  const [r] = await db.query("DELETE FROM notifications WHERE id=?", [req.params.id]);
  if (!r.affectedRows) return fail(res, 404, "Notifikasi tidak ditemukan");
  ok(res, null, { message: "Notifikasi dihapus" });
}));

/* ── Admin: Bank Accounts ── */
const parseBank = (b) => {
  const bank_name = clean(b.bank_name, 50);
  const account_number = clean(b.account_number, 50);
  const account_name = clean(b.account_name, 100);
  const is_active = b.is_active === 0 || b.is_active === false || b.is_active === "0" ? 0 : 1;

  if (bank_name.length < 2) return { error: "Nama bank minimal 2 karakter" };
  if (account_number.length < 4) return { error: "Nomor rekening minimal 4 digit" };
  if (account_name.length < 3) return { error: "Atas nama minimal 3 karakter" };
  return { data: { bank_name, account_number, account_name, is_active } };
};

app.get("/api/admin/banks", adminOnly, wrap((req, res) =>
  paginate(req, res, {
    from: "bank_accounts",
    select: "id,bank_name,account_number,account_name,is_active,created_at",
    searchCols: ["bank_name", "account_number", "account_name"],
    sortable: { created_at: "created_at", bank_name: "bank_name", account_name: "account_name" },
    defaultSort: "created_at",
    filters: { is_active: "is_active" },
  })
));

app.post("/api/admin/banks", adminOnly, wrap(async (req, res) => {
  const { error, data } = parseBank(req.body);
  if (error) return fail(res, 400, error);
  await db.query(
    "INSERT INTO bank_accounts (bank_name, account_number, account_name, is_active) VALUES (?,?,?,?)",
    [data.bank_name, data.account_number, data.account_name, data.is_active]
  );
  ok(res, null, { message: "Rekening bank berhasil ditambahkan" }, 201);
}));

app.put("/api/admin/banks/:id", adminOnly, wrap(async (req, res) => {
  const { error, data } = parseBank(req.body);
  if (error) return fail(res, 400, error);
  const [r] = await db.query(
    "UPDATE bank_accounts SET bank_name=?, account_number=?, account_name=?, is_active=? WHERE id=?",
    [data.bank_name, data.account_number, data.account_name, data.is_active, req.params.id]
  );
  if (!r.affectedRows) return fail(res, 404, "Rekening bank tidak ditemukan");
  ok(res, null, { message: "Rekening bank berhasil diperbarui" });
}));

app.delete("/api/admin/banks/:id", adminOnly, wrap(async (req, res) => {
  const [r] = await db.query("DELETE FROM bank_accounts WHERE id=?", [req.params.id]);
  if (!r.affectedRows) return fail(res, 404, "Rekening bank tidak ditemukan");
  ok(res, null, { message: "Rekening bank berhasil dihapus" });
}));

/* ── Admin: Transactions ── */
app.get("/api/admin/transactions", adminOnly, wrap((req, res) =>
  paginate(req, res, {
    from: "transactions t JOIN users u ON u.id = t.user_id",
    select: "t.id,t.type,t.title,t.amount,t.source,t.status,t.reference,t.target,t.created_at,u.username,u.name as user_name",
    searchCols: ["t.title", "t.reference", "u.username", "t.target"],
    sortable: { created_at: "t.created_at", amount: "t.amount", username: "u.username" },
    defaultSort: "created_at",
    filters: { type: "t.type", status: "t.status" },
  })
));

app.put("/api/admin/transactions/:id/status", adminOnly, wrap(async (req, res) => {
  const status = clean(req.body.status, 20);
  if (!["success", "pending", "failed"].includes(status)) return fail(res, 400, "Status harus success, pending, atau failed");
  await withTx(async (c) => {
    const [[tx]] = await c.query("SELECT * FROM transactions WHERE id=? FOR UPDATE", [req.params.id]);
    if (!tx) throw new HttpError(404, "Transaksi tidak ditemukan");
    if (tx.status !== "success" && status === "success" && tx.type === "topup") {
      await c.query("UPDATE users SET balance=balance+? WHERE id=?", [tx.amount, tx.user_id]);
    } else if (tx.status === "success" && status === "failed" && tx.type === "topup") {
      await c.query("UPDATE users SET balance=GREATEST(0, balance-?) WHERE id=?", [tx.amount, tx.user_id]);
    }
    await c.query("UPDATE transactions SET status=? WHERE id=?", [status, req.params.id]);
  });
  ok(res, null, { message: `Status transaksi berhasil diubah ke ${status}` });
}));

function parsePromo(b) {
  const tag = clean(b.tag, 50).toUpperCase();
  const title = clean(b.title, 255);
  const description = clean(b.description, 1000);
  const style = clean(b.style, 100) || "from-emerald-500 to-accent-500";
  const link_url = clean(b.link_url, 255);
  const is_active = b.is_active === 0 || b.is_active === false || b.is_active === "0" ? 0 : 1;
  const sort_order = parseInt(b.sort_order) || 0;

  if (!tag) return { error: "Tag promo wajib diisi (contoh: FOOD, PAYLATER, PULSA)" };
  if (!title) return { error: "Judul promo wajib diisi" };

  return {
    data: { tag, title, description, style, link_url, is_active, sort_order },
  };
}

function formatWhatsAppUrl(number, message = "") {
  if (!number) return "";
  let cleanNumber = String(number).replace(/[^0-9]/g, "");
  if (cleanNumber.startsWith("0")) {
    cleanNumber = "62" + cleanNumber.slice(1);
  }
  const textQuery = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${cleanNumber}${textQuery}`;
}

/* ── Promos (Public / User) ── */
app.get("/api/promos", wrap(async (req, res) => {
  const [rows] = await db.query(
    "SELECT id, tag, title, description, style, link_url, is_active, sort_order, created_at FROM promos WHERE is_active = 1 ORDER BY sort_order ASC, id ASC"
  );
  ok(res, rows);
}));

/* ── Admin: Promos ── */
app.get("/api/admin/promos", adminOnly, wrap((req, res) =>
  paginate(req, res, {
    from: "promos",
    select: "*",
    searchCols: ["tag", "title", "description"],
    sortable: { sort_order: "sort_order", created_at: "created_at", id: "id", title: "title" },
    defaultSort: "sort_order",
    filters: { is_active: "is_active" },
  })
));

app.post("/api/admin/promos", adminOnly, wrap(async (req, res) => {
  const { error, data } = parsePromo(req.body);
  if (error) return fail(res, 400, error);
  const [result] = await db.query(
    "INSERT INTO promos (tag, title, description, style, link_url, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [data.tag, data.title, data.description, data.style, data.link_url, data.is_active, data.sort_order]
  );
  ok(res, { id: result.insertId, ...data }, { message: "Promo berhasil ditambahkan" }, 201);
}));

app.put("/api/admin/promos/:id", adminOnly, wrap(async (req, res) => {
  const { error, data } = parsePromo(req.body);
  if (error) return fail(res, 400, error);
  const [result] = await db.query(
    "UPDATE promos SET tag=?, title=?, description=?, style=?, link_url=?, is_active=?, sort_order=? WHERE id=?",
    [data.tag, data.title, data.description, data.style, data.link_url, data.is_active, data.sort_order, req.params.id]
  );
  if (!result.affectedRows) return fail(res, 404, "Promo tidak ditemukan");
  ok(res, { id: Number(req.params.id), ...data }, { message: "Promo berhasil diperbarui" });
}));

app.delete("/api/admin/promos/:id", adminOnly, wrap(async (req, res) => {
  const [result] = await db.query("DELETE FROM promos WHERE id=?", [req.params.id]);
  if (!result.affectedRows) return fail(res, 404, "Promo tidak ditemukan");
  ok(res, null, { message: "Promo berhasil dihapus" });
}));

/* ── App Settings (Public & Admin) ── */
app.get("/api/settings/public", wrap(async (req, res) => {
  const [rows] = await db.query("SELECT setting_key, setting_value FROM app_settings");
  const settings = rows.reduce((acc, r) => {
    acc[r.setting_key] = r.setting_value;
    return acc;
  }, {});
  const whatsapp_number = settings.whatsapp_number || "081234567890";
  const whatsapp_message = settings.whatsapp_message || "Halo Admin KreditPay, saya butuh bantuan terkait akun saya.";
  const whatsapp_url = formatWhatsAppUrl(whatsapp_number, whatsapp_message);
  ok(res, {
    ...settings,
    whatsapp_number,
    whatsapp_message,
    whatsapp_url,
  });
}));

app.get("/api/admin/settings", adminOnly, wrap(async (req, res) => {
  const [rows] = await db.query("SELECT setting_key, setting_value, description, updated_at FROM app_settings");
  const settings = rows.reduce((acc, r) => {
    acc[r.setting_key] = r.setting_value;
    return acc;
  }, {});
  const whatsapp_number = settings.whatsapp_number || "081234567890";
  const whatsapp_message = settings.whatsapp_message || "Halo Admin KreditPay, saya butuh bantuan terkait akun saya.";
  const whatsapp_url = formatWhatsAppUrl(whatsapp_number, whatsapp_message);
  ok(res, {
    settings,
    whatsapp_url,
    items: rows,
  });
}));

app.put("/api/admin/settings", adminOnly, wrap(async (req, res) => {
  const body = req.body || {};
  const allowed = ["whatsapp_number", "whatsapp_message", "app_name", "cs_email", "cs_operational_hours"];
  for (const key of allowed) {
    if (body[key] !== undefined) {
      const val = clean(String(body[key]), 500);
      await db.query(
        "INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
        [key, val]
      );
    }
  }
  const [rows] = await db.query("SELECT setting_key, setting_value FROM app_settings");
  const settings = rows.reduce((acc, r) => {
    acc[r.setting_key] = r.setting_value;
    return acc;
  }, {});
  const whatsapp_number = settings.whatsapp_number || "081234567890";
  const whatsapp_message = settings.whatsapp_message || "Halo Admin KreditPay, saya butuh bantuan terkait akun saya.";
  const whatsapp_url = formatWhatsAppUrl(whatsapp_number, whatsapp_message);
  ok(res, { settings, whatsapp_url }, { message: "Pengaturan berhasil disimpan" });
}));

/* ── Live Chat (User & Admin CS) ── */
// User: Ambil riwayat chat (Limit 50 + Infinite scroll)
app.get("/api/chat/messages", userOnly, wrap(async (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
  const beforeId = parseInt(req.query.beforeId) || null;
  const afterId = parseInt(req.query.afterId) || null;

  let query = "";
  let params = [];

  if (afterId) {
    // Polling pesan baru
    query = "SELECT id, user_id, sender_role, sender_id, message, attachment, is_read, created_at FROM chat_messages WHERE user_id = ? AND id > ? ORDER BY id ASC";
    params = [req.user.id, afterId];
    const [messages] = await db.query(query, params);
    if (messages.length > 0) {
      await db.query(
        "UPDATE chat_messages SET is_read = 1 WHERE user_id = ? AND sender_role = 'admin' AND is_read = 0",
        [req.user.id]
      );
    }
    return ok(res, messages, { hasMore: false });
  }

  if (beforeId) {
    // Infinite scroll memuat pesan lebih lama (ke atas)
    query = "SELECT id, user_id, sender_role, sender_id, message, attachment, is_read, created_at FROM chat_messages WHERE user_id = ? AND id < ? ORDER BY id DESC LIMIT ?";
    params = [req.user.id, beforeId, limit];
  } else {
    // Load awal: 50 pesan terakhir
    query = "SELECT id, user_id, sender_role, sender_id, message, attachment, is_read, created_at FROM chat_messages WHERE user_id = ? ORDER BY id DESC LIMIT ?";
    params = [req.user.id, limit];
  }

  const [rows] = await db.query(query, params);
  const messages = rows.reverse(); // Urutkan kronologis dari yang terlama ke terbaru

  let hasMore = false;
  if (messages.length > 0) {
    const oldestId = messages[0].id;
    const [[{ count }]] = await db.query(
      "SELECT COUNT(*) AS count FROM chat_messages WHERE user_id = ? AND id < ?",
      [req.user.id, oldestId]
    );
    hasMore = count > 0;
  }

  // Tandai pesan dari admin sudah dibaca oleh user
  await db.query(
    "UPDATE chat_messages SET is_read = 1 WHERE user_id = ? AND sender_role = 'admin' AND is_read = 0",
    [req.user.id]
  );

  ok(res, messages, {
    hasMore,
    pagination: {
      limit,
      hasMore,
      oldestId: messages[0]?.id || null,
      latestId: messages[messages.length - 1]?.id || null,
    },
  });
}));

// User: Kirim pesan ke CS
app.post("/api/chat/messages", userOnly, uploadChat.single("attachment"), wrap(async (req, res) => {
  const message = cleanHtml(req.body.message, 3000);
  const attachment = req.file ? `/uploads/${req.file.filename}` : null;
  if (!message && !attachment) {
    return fail(res, 400, "Pesan atau lampiran tidak boleh kosong");
  }
  const [r] = await db.query(
    "INSERT INTO chat_messages (user_id, sender_role, sender_id, message, attachment, is_read) VALUES (?, 'user', ?, ?, ?, 0)",
    [req.user.id, req.user.id, message, attachment]
  );
  const [[created]] = await db.query("SELECT * FROM chat_messages WHERE id = ?", [r.insertId]);
  ok(res, created, { message: "Pesan terkirim" }, 201);
}));

// User: Hitung unread dari admin
app.get("/api/chat/unread", userOnly, wrap(async (req, res) => {
  const [[{ count }]] = await db.query(
    "SELECT COUNT(*) AS count FROM chat_messages WHERE user_id = ? AND sender_role = 'admin' AND is_read = 0",
    [req.user.id]
  );
  ok(res, { unread: count });
}));

// Admin: Daftar percakapan pengguna
app.get("/api/admin/chat/conversations", adminOnly, wrap(async (req, res) => {
  const search = clean(req.query.search, 100);
  let query = `
    SELECT 
      u.id AS user_id,
      u.name,
      u.username,
      u.email,
      u.phone,
      u.avatar,
      u.balance,
      u.paylater_limit,
      u.paylater_used,
      m.last_message,
      m.last_message_at,
      m.last_sender_role,
      COALESCE(un.unread_count, 0) AS unread_count
    FROM users u
    JOIN (
      SELECT c1.user_id, c1.message AS last_message, c1.created_at AS last_message_at, c1.sender_role AS last_sender_role
      FROM chat_messages c1
      JOIN (
        SELECT user_id, MAX(id) AS max_id FROM chat_messages GROUP BY user_id
      ) c2 ON c1.id = c2.max_id
    ) m ON u.id = m.user_id
    LEFT JOIN (
      SELECT user_id, COUNT(*) AS unread_count
      FROM chat_messages
      WHERE sender_role = 'user' AND is_read = 0
      GROUP BY user_id
    ) un ON u.id = un.user_id
  `;
  const params = [];
  if (search) {
    query += " WHERE u.name LIKE ? OR u.username LIKE ? OR u.phone LIKE ? OR m.last_message LIKE ?";
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  query += " ORDER BY m.last_message_at DESC";
  const [conversations] = await db.query(query, params);
  ok(res, conversations);
}));

// Admin: Ambil pesan dari user tertentu (Limit 50 + Infinite scroll)
app.get("/api/admin/chat/:userId/messages", adminOnly, wrap(async (req, res) => {
  const userId = parseInt(req.params.userId);
  if (!userId) return fail(res, 400, "User ID tidak valid");

  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
  const beforeId = parseInt(req.query.beforeId) || null;
  const afterId = parseInt(req.query.afterId) || null;

  let query = "";
  let params = [];

  if (afterId) {
    // Polling pesan baru
    query = "SELECT id, user_id, sender_role, sender_id, message, attachment, is_read, created_at FROM chat_messages WHERE user_id = ? AND id > ? ORDER BY id ASC";
    params = [userId, afterId];
    const [messages] = await db.query(query, params);
    if (messages.length > 0) {
      await db.query(
        "UPDATE chat_messages SET is_read = 1 WHERE user_id = ? AND sender_role = 'user' AND is_read = 0",
        [userId]
      );
    }
    return ok(res, messages, { hasMore: false });
  }

  if (beforeId) {
    // Infinite scroll memuat pesan lebih lama (ke atas)
    query = "SELECT id, user_id, sender_role, sender_id, message, attachment, is_read, created_at FROM chat_messages WHERE user_id = ? AND id < ? ORDER BY id DESC LIMIT ?";
    params = [userId, beforeId, limit];
  } else {
    // Load awal: 50 pesan terakhir
    query = "SELECT id, user_id, sender_role, sender_id, message, attachment, is_read, created_at FROM chat_messages WHERE user_id = ? ORDER BY id DESC LIMIT ?";
    params = [userId, limit];
  }

  const [rows] = await db.query(query, params);
  const messages = rows.reverse();

  let hasMore = false;
  if (messages.length > 0) {
    const oldestId = messages[0].id;
    const [[{ count }]] = await db.query(
      "SELECT COUNT(*) AS count FROM chat_messages WHERE user_id = ? AND id < ?",
      [userId, oldestId]
    );
    hasMore = count > 0;
  }

  // Tandai pesan dari user sudah dibaca oleh admin
  await db.query(
    "UPDATE chat_messages SET is_read = 1 WHERE user_id = ? AND sender_role = 'user' AND is_read = 0",
    [userId]
  );

  ok(res, messages, {
    hasMore,
    pagination: {
      limit,
      hasMore,
      oldestId: messages[0]?.id || null,
      latestId: messages[messages.length - 1]?.id || null,
    },
  });
}));

// Admin: Balas pesan ke user tertentu
app.post("/api/admin/chat/:userId/messages", adminOnly, uploadChat.single("attachment"), wrap(async (req, res) => {
  const userId = parseInt(req.params.userId);
  if (!userId) return fail(res, 400, "User ID tidak valid");
  const message = cleanHtml(req.body.message, 3000);
  const attachment = req.file ? `/uploads/${req.file.filename}` : null;
  if (!message && !attachment) {
    return fail(res, 400, "Pesan atau lampiran tidak boleh kosong");
  }
  const [r] = await db.query(
    "INSERT INTO chat_messages (user_id, sender_role, sender_id, message, attachment, is_read) VALUES (?, 'admin', ?, ?, ?, 0)",
    [userId, req.user.id, message, attachment]
  );
  const [[created]] = await db.query("SELECT * FROM chat_messages WHERE id = ?", [r.insertId]);
  ok(res, created, { message: "Pesan terkirim" }, 201);
}));

// Admin: Total unread pesan masuk dari seluruh user
app.get("/api/admin/chat/unread", adminOnly, wrap(async (req, res) => {
  const [[{ count }]] = await db.query(
    "SELECT COUNT(*) AS count FROM chat_messages WHERE sender_role = 'user' AND is_read = 0"
  );
  ok(res, { unread: count });
}));

/* ── Open API Wilayah Indonesia (wilayah.id) Proxy & In-Memory Cache ── */
const WILAYAH_BASE = "https://wilayah.id/api";
const wilayahCache = {
  provinces: null,
  regencies: {},
  districts: {},
  villages: {},
};

const FALLBACK_PROVINCES = [
  { code: "11", name: "Aceh" },
  { code: "12", name: "Sumatera Utara" },
  { code: "13", name: "Sumatera Barat" },
  { code: "14", name: "Riau" },
  { code: "15", name: "Jambi" },
  { code: "16", name: "Sumatera Selatan" },
  { code: "17", name: "Bengkulu" },
  { code: "18", name: "Lampung" },
  { code: "19", name: "Kepulauan Bangka Belitung" },
  { code: "21", name: "Kepulauan Riau" },
  { code: "31", name: "DKI Jakarta" },
  { code: "32", name: "Jawa Barat" },
  { code: "33", name: "Jawa Tengah" },
  { code: "34", name: "DI Yogyakarta" },
  { code: "35", name: "Jawa Timur" },
  { code: "36", name: "Banten" },
  { code: "51", name: "Bali" },
  { code: "52", name: "Nusa Tenggara Barat" },
  { code: "53", name: "Nusa Tenggara Timur" },
  { code: "61", name: "Kalimantan Barat" },
  { code: "62", name: "Kalimantan Tengah" },
  { code: "63", name: "Kalimantan Selatan" },
  { code: "64", name: "Kalimantan Timur" },
  { code: "65", name: "Kalimantan Utara" },
  { code: "71", name: "Sulawesi Utara" },
  { code: "72", name: "Sulawesi Tengah" },
  { code: "73", name: "Sulawesi Selatan" },
  { code: "74", name: "Sulawesi Tenggara" },
  { code: "75", name: "Gorontalo" },
  { code: "76", name: "Sulawesi Barat" },
  { code: "81", name: "Maluku" },
  { code: "82", name: "Maluku Utara" },
  { code: "91", name: "Papua Barat" },
  { code: "92", name: "Papua" },
  { code: "93", name: "Papua Selatan" },
  { code: "94", name: "Papua Tengah" },
  { code: "95", name: "Papua Pegunungan" },
  { code: "96", name: "Papua Barat Daya" },
];

const FALLBACK_REGENCIES = {
  "31": [
    { code: "31.71", name: "Kota Administrasi Jakarta Pusat" },
    { code: "31.72", name: "Kota Administrasi Jakarta Utara" },
    { code: "31.73", name: "Kota Administrasi Jakarta Barat" },
    { code: "31.74", name: "Kota Administrasi Jakarta Selatan" },
    { code: "31.75", name: "Kota Administrasi Jakarta Timur" },
    { code: "31.01", name: "Kabupaten Kepulauan Seribu" },
  ],
  "32": [
    { code: "32.73", name: "Kota Bandung" },
    { code: "32.04", name: "Kabupaten Bandung" },
    { code: "32.17", name: "Kabupaten Bandung Barat" },
    { code: "32.75", name: "Kota Bekasi" },
    { code: "32.16", name: "Kabupaten Bekasi" },
    { code: "32.71", name: "Kota Bogor" },
    { code: "32.01", name: "Kabupaten Bogor" },
    { code: "32.76", name: "Kota Depok" },
    { code: "32.74", name: "Kota Cirebon" },
    { code: "32.09", name: "Kabupaten Cirebon" },
    { code: "32.77", name: "Kota Cimahi" },
    { code: "32.72", name: "Kota Sukabumi" },
    { code: "32.02", name: "Kabupaten Sukabumi" },
    { code: "32.78", name: "Kota Tasikmalaya" },
    { code: "32.06", name: "Kabupaten Tasikmalaya" },
    { code: "32.15", name: "Kabupaten Karawang" },
    { code: "32.14", name: "Kabupaten Purwakarta" },
    { code: "32.13", name: "Kabupaten Subang" },
    { code: "32.11", name: "Kabupaten Sumedang" },
    { code: "32.05", name: "Kabupaten Garut" },
    { code: "32.03", name: "Kabupaten Cianjur" },
    { code: "32.12", name: "Kabupaten Indramayu" },
  ],
  "36": [
    { code: "36.71", name: "Kota Tangerang" },
    { code: "36.74", name: "Kota Tangerang Selatan" },
    { code: "36.03", name: "Kabupaten Tangerang" },
    { code: "36.73", name: "Kota Serang" },
    { code: "36.04", name: "Kabupaten Serang" },
    { code: "36.72", name: "Kota Cilegon" },
    { code: "36.02", name: "Kabupaten Lebak" },
    { code: "36.01", name: "Kabupaten Pandeglang" },
  ],
  "33": [
    { code: "33.74", name: "Kota Semarang" },
    { code: "33.72", name: "Kota Surakarta (Solo)" },
    { code: "33.75", name: "Kota Pekalongan" },
    { code: "33.76", name: "Kota Tegal" },
    { code: "33.71", name: "Kota Magelang" },
    { code: "33.73", name: "Kota Salatiga" },
    { code: "33.02", name: "Kabupaten Banyumas" },
    { code: "33.01", name: "Kabupaten Cilacap" },
    { code: "33.19", name: "Kabupaten Kudus" },
  ],
  "34": [
    { code: "34.71", name: "Kota Yogyakarta" },
    { code: "34.04", name: "Kabupaten Sleman" },
    { code: "34.02", name: "Kabupaten Bantul" },
    { code: "34.03", name: "Kabupaten Gunungkidul" },
    { code: "34.01", name: "Kabupaten Kulon Progo" },
  ],
  "35": [
    { code: "35.78", name: "Kota Surabaya" },
    { code: "35.73", name: "Kota Malang" },
    { code: "35.07", name: "Kabupaten Malang" },
    { code: "35.15", name: "Kabupaten Sidoarjo" },
    { code: "35.25", name: "Kabupaten Gresik" },
    { code: "35.71", name: "Kota Kediri" },
    { code: "35.72", name: "Kota Blitar" },
    { code: "35.77", name: "Kota Madiun" },
    { code: "35.09", name: "Kabupaten Jember" },
    { code: "35.10", name: "Kabupaten Banyuwangi" },
  ],
  "51": [
    { code: "51.71", name: "Kota Denpasar" },
    { code: "51.03", name: "Kabupaten Badung" },
    { code: "51.04", name: "Kabupaten Gianyar" },
    { code: "51.08", name: "Kabupaten Buleleng" },
    { code: "51.02", name: "Kabupaten Tabanan" },
  ],
  "12": [
    { code: "12.71", name: "Kota Medan" },
    { code: "12.75", name: "Kota Binjai" },
    { code: "12.72", name: "Kota Pematangsiantar" },
    { code: "12.07", name: "Kabupaten Deli Serdang" },
    { code: "12.06", name: "Kabupaten Karo" },
  ],
};

app.get("/api/wilayah/provinces", wrap(async (req, res) => {
  if (wilayahCache.provinces && wilayahCache.provinces.length) {
    return ok(res, wilayahCache.provinces);
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const r = await fetch(`${WILAYAH_BASE}/provinces.json`, { signal: controller.signal });
    clearTimeout(timer);
    if (!r.ok) throw new Error("Status " + r.status);
    const json = await r.json();
    const list = Array.isArray(json?.data) ? json.data : [];
    if (list.length) {
      wilayahCache.provinces = list.sort((a, b) => a.name.localeCompare(b.name));
      return ok(res, wilayahCache.provinces);
    }
  } catch (err) {
    console.warn("[Wilayah API] provinces fetch error, using fallback:", err.message);
  }
  return ok(res, FALLBACK_PROVINCES);
}));

app.get("/api/wilayah/regencies/:provinceCode", wrap(async (req, res) => {
  const code = clean(req.params.provinceCode, 10);
  if (!code) return ok(res, []);
  if (wilayahCache.regencies[code] && wilayahCache.regencies[code].length) {
    return ok(res, wilayahCache.regencies[code]);
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const r = await fetch(`${WILAYAH_BASE}/regencies/${code}.json`, { signal: controller.signal });
    clearTimeout(timer);
    if (!r.ok) throw new Error("Status " + r.status);
    const json = await r.json();
    const list = Array.isArray(json?.data) ? json.data : [];
    if (list.length) {
      const sorted = list.sort((a, b) => a.name.localeCompare(b.name));
      wilayahCache.regencies[code] = sorted;
      return ok(res, sorted);
    }
  } catch (err) {
    console.warn(`[Wilayah API] regencies ${code} fetch error, using fallback:`, err.message);
  }
  return ok(res, FALLBACK_REGENCIES[code] || []);
}));

app.get("/api/wilayah/districts/:regencyCode", wrap(async (req, res) => {
  const code = clean(req.params.regencyCode, 20);
  if (!code) return ok(res, []);
  if (wilayahCache.districts[code] && wilayahCache.districts[code].length) {
    return ok(res, wilayahCache.districts[code]);
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const r = await fetch(`${WILAYAH_BASE}/districts/${code}.json`, { signal: controller.signal });
    clearTimeout(timer);
    if (!r.ok) throw new Error("Status " + r.status);
    const json = await r.json();
    const list = Array.isArray(json?.data) ? json.data : [];
    if (list.length) {
      const sorted = list.sort((a, b) => a.name.localeCompare(b.name));
      wilayahCache.districts[code] = sorted;
      return ok(res, sorted);
    }
  } catch (err) {
    console.warn(`[Wilayah API] districts ${code} fetch error:`, err.message);
  }
  return ok(res, []);
}));

app.get("/api/wilayah/villages/:districtCode", wrap(async (req, res) => {
  const code = clean(req.params.districtCode, 30);
  if (!code) return ok(res, []);
  if (wilayahCache.villages[code] && wilayahCache.villages[code].length) {
    return ok(res, wilayahCache.villages[code]);
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const r = await fetch(`${WILAYAH_BASE}/villages/${code}.json`, { signal: controller.signal });
    clearTimeout(timer);
    if (!r.ok) throw new Error("Status " + r.status);
    const json = await r.json();
    const list = Array.isArray(json?.data) ? json.data : [];
    if (list.length) {
      const sorted = list.sort((a, b) => a.name.localeCompare(b.name));
      wilayahCache.villages[code] = sorted;
      return ok(res, sorted);
    }
  } catch (err) {
    console.warn(`[Wilayah API] villages ${code} fetch error:`, err.message);
  }
  return ok(res, []);
}));

/* ── Errors ── */
app.use("/api", (req, res) => fail(res, 404, "Endpoint tidak ditemukan"));
app.use((err, req, res, _next) => {
  if (err instanceof HttpError) return fail(res, err.status, err.message);
  if (err.code === "ER_DUP_ENTRY") return fail(res, 409, "Username, email, atau No HP sudah terdaftar");
  if (err.message === "INVALID_FILE") return fail(res, 400, "Format gambar harus JPG, PNG, atau WEBP");
  if (err instanceof multer.MulterError) return fail(res, 400, "Upload gagal: ukuran maksimal 2MB");
  console.error(err);
  fail(res, 500, "Terjadi kesalahan pada server");
});

async function initDb() {
  try {
    try {
      await db.query("ALTER TABLE users ADD COLUMN level INT NOT NULL DEFAULT 1 AFTER role");
    } catch {
      // Kolom level sudah ada
    }

    try {
      await db.query("ALTER TABLE transactions ADD COLUMN proof VARCHAR(255) NULL AFTER target");
    } catch {
      // Kolom proof sudah ada
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS bank_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bank_name VARCHAR(50) NOT NULL,
        account_number VARCHAR(50) NOT NULL,
        account_name VARCHAR(100) NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_bank_name (bank_name),
        INDEX idx_bank_active (is_active)
      ) ENGINE=InnoDB;
    `);

    const [[{ count }]] = await db.query("SELECT COUNT(*) AS count FROM bank_accounts");
    if (count === 0) {
      await db.query(`
        INSERT INTO bank_accounts (bank_name, account_number, account_name, is_active) VALUES
        ('BCA', '123456789', 'MAS KU', 1),
        ('Mandiri', '1370012345678', 'MAS KU', 1),
        ('BRI', '001201098765432', 'MAS KU', 1)
      `);
      console.log("Seeded initial bank accounts");
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS paylater_applications (
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
    `);

    const plAlterCols = [
      "ALTER TABLE paylater_applications ADD COLUMN requested_amount DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER user_id",
      "ALTER TABLE paylater_applications ADD COLUMN requested_tenor INT NOT NULL DEFAULT 12 AFTER requested_amount",
      "ALTER TABLE paylater_applications ADD COLUMN monthly_installment DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER requested_tenor",
      "ALTER TABLE paylater_applications ADD COLUMN ktp_back_image VARCHAR(255) NULL AFTER ktp_image",
      "ALTER TABLE paylater_applications ADD COLUMN full_name VARCHAR(100) NULL AFTER user_id",
      "ALTER TABLE paylater_applications ADD COLUMN birth_place VARCHAR(100) NULL AFTER nik",
      "ALTER TABLE paylater_applications ADD COLUMN ktp_address TEXT NULL AFTER mother_name",
      "ALTER TABLE paylater_applications ADD COLUMN ktp_province VARCHAR(100) NULL AFTER ktp_address",
      "ALTER TABLE paylater_applications ADD COLUMN ktp_city VARCHAR(100) NULL AFTER ktp_province",
      "ALTER TABLE paylater_applications ADD COLUMN ktp_district VARCHAR(100) NULL AFTER ktp_city",
      "ALTER TABLE paylater_applications ADD COLUMN ktp_village VARCHAR(100) NULL AFTER ktp_district",
      "ALTER TABLE paylater_applications ADD COLUMN domicile_address TEXT NULL AFTER ktp_village",
      "ALTER TABLE paylater_applications ADD COLUMN domicile_province VARCHAR(100) NULL AFTER domicile_address",
      "ALTER TABLE paylater_applications ADD COLUMN domicile_city VARCHAR(100) NULL AFTER domicile_province",
      "ALTER TABLE paylater_applications ADD COLUMN domicile_district VARCHAR(100) NULL AFTER domicile_city",
      "ALTER TABLE paylater_applications ADD COLUMN domicile_village VARCHAR(100) NULL AFTER domicile_district",
      "ALTER TABLE paylater_applications ADD COLUMN residence_years VARCHAR(50) NULL AFTER domicile_village",
      "ALTER TABLE paylater_applications ADD COLUMN emergency_relation VARCHAR(50) NULL AFTER emergency_name",
      "ALTER TABLE paylater_applications ADD COLUMN emergency_address TEXT NULL AFTER emergency_phone",
      "ALTER TABLE paylater_applications ADD COLUMN kk_image VARCHAR(255) NULL AFTER selfie_image",
      "ALTER TABLE paylater_applications ADD COLUMN slip_gaji_image VARCHAR(255) NULL AFTER kk_image",
      "ALTER TABLE paylater_applications ADD COLUMN npwp_image VARCHAR(255) NULL AFTER slip_gaji_image",
      "ALTER TABLE paylater_applications ADD COLUMN bpjs_image VARCHAR(255) NULL AFTER npwp_image",
      "ALTER TABLE paylater_applications ADD COLUMN ijazah_image VARCHAR(255) NULL AFTER bpjs_image",
      "ALTER TABLE paylater_applications ADD COLUMN passport_image VARCHAR(255) NULL AFTER ijazah_image",
    ];
    for (const sql of plAlterCols) {
      try { await db.query(sql); } catch {}
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS level_configs (
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
    `);

    try {
      await db.query("ALTER TABLE level_configs MODIFY COLUMN title TEXT NOT NULL");
    } catch {
      // ignore
    }

    const defaultPindahSaldoContent = JSON.stringify({
      fee_warning: "Perpindahan Saldo PayLater ke Saldo utama membutuhkan Dana Layanan. Dana tersebut harus melalui proses Topup Saldo menggunakan dana pribadi Anda.\n\nDana Layanan ini Akan Tetap Masuk ke Saldo Anda, tidak diambil perusahaan.",
      fee_amount: 100000
    });

    const [[{ count: levelCount }]] = await db.query("SELECT COUNT(*) AS count FROM level_configs");
    if (levelCount === 0) {
      const initialLevels = [
        [
          1,
          "Level 1",
          "Pop-up Terkunci",
          "Fitur Terkunci",
          "Akses Dibatasi",
          "Maaf, Anda masih berada di Level 1. Silakan Top Up saldo untuk membuka fitur ini.",
          "Lakukan top up saldo minimal untuk menaikkan level akun Anda.",
          "Top Up Sekarang",
          "Kembali",
          "Informasi Level 1",
          "Akun Level 1 merupakan tingkat awal. Pengguna perlu melakukan verifikasi dan transaksi deposit awal untuk membuka fitur transaksi penuh."
        ],
        [
          2,
          "Level 2",
          "Info Autodebet",
          "Rekening Belum Terintegrasi Autodebet",
          "Integrasi Pembayaran",
          "Autodebet adalah sistem pembayaran otomatis yang memungkinkan saldo Anda terpotong langsung untuk membayar tagihan tepat waktu.",
          "Fitur ini wajib diaktifkan demi keamanan dan kelancaran transaksi Anda.",
          "Lanjutkan Integrasi",
          "Kembali",
          "Ketentuan Integrasi Autodebet",
          "Sistem autodebet memastikan pembayaran angsuran dan tagihan berjalan otomatis tanpa kendala."
        ],
        [
          3,
          "Level 3",
          "Info Asuransi",
          "Transfer ke Rekening",
          "ANDA TERTUNDA",
          "Sistem keamanan kami menahan transaksi ini karena memerlukan Verifikasi Asuransi pada akun Anda. Mohon selesaikan administrasi asuransi agar dana dapat dicairkan ke rekening tujuan dengan aman.",
          "Fitur asuransi memastikan transaksi pencairan dana Anda terlindungi secara penuh.",
          "Cek Detail Keterangan",
          "Batalkan Transaksi",
          "Ketentuan Asuransi Dana",
          JSON.stringify([
            {
              header: "Mengapa perlu Asuransi?",
              body: "Sesuai dengan kebijakan keamanan transaksi tingkat tinggi (Level 3+), pencairan dana memerlukan Deposit Asuransi Sementara. Ini bertujuan untuk memverifikasi bahwa rekening penerima adalah valid dan aktif."
            },
            {
              header: "Apakah Dana Kembali?",
              body: "YA, 100% KEMBALI. Dana asuransi ini bersifat Refundable. Setelah sistem berhasil memverifikasi transfer masuk, dana asuransi akan otomatis dikembalikan ke saldo akun Anda dalam waktu 10-30 menit bersamaan dengan dana transfer Anda."
            }
          ])
        ],
        [
          4,
          "Level 4",
          "Pindah Saldo",
          'Transfer Saldo <br><span class="text-teal-400">PayLater Sedang Proses</span>',
          "PINDAH SALDO",
          "Permintaan pemindahan limit PayLater ke Saldo Utama Anda sedang diproses oleh sistem.",
          "Silakan lakukan konfirmasi pemindahan saldo untuk melanjutkan transaksi.",
          "Pindahkan Saldo",
          "Batal",
          "Rincian Perpindahan",
          defaultPindahSaldoContent
        ],
        [
          5,
          "Level 5",
          "Pengembangan 1",
          'Transfer Saldo <br><span class="text-teal-400">PayLater Sedang Proses</span>',
          "PINDAH SALDO",
          "Permintaan pemindahan limit PayLater ke Saldo Utama Anda sedang diproses oleh sistem.",
          "Silakan lakukan konfirmasi pemindahan saldo untuk melanjutkan transaksi.",
          "Pindahkan Saldo",
          "Batal",
          "Rincian Perpindahan",
          defaultPindahSaldoContent
        ],
        [
          6,
          "Level 6",
          "Pengembangan 2",
          'Transfer Saldo <br><span class="text-teal-400">PayLater Sedang Proses</span>',
          "PINDAH SALDO",
          "Permintaan pemindahan limit PayLater ke Saldo Utama Anda sedang diproses oleh sistem.",
          "Silakan lakukan konfirmasi pemindahan saldo untuk melanjutkan transaksi.",
          "Pindahkan Saldo",
          "Batal",
          "Rincian Perpindahan",
          defaultPindahSaldoContent
        ],
        [
          7,
          "Level 7",
          "Fitur VIP/Prioritas",
          'Transfer Saldo <br><span class="text-teal-400">PayLater Sedang Proses</span>',
          "PINDAH SALDO",
          "Permintaan pemindahan limit PayLater ke Saldo Utama Anda sedang diproses oleh sistem.",
          "Silakan lakukan konfirmasi pemindahan saldo untuk melanjutkan transaksi.",
          "Pindahkan Saldo",
          "Batal",
          "Rincian Perpindahan",
          defaultPindahSaldoContent
        ]
      ];

      for (const lvl of initialLevels) {
        await db.query(
          "INSERT INTO level_configs (level, name, badge_label, title, subtitle, message, note, button_text, secondary_button_text, detail_title, detail_content) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          lvl
        );
      }
      console.log("Seeded initial level configurations");
    } else {
      // Pastikan level 4, 5, 6, 7 memakai default Pindah Saldo bila masih memakai data lama
      await db.query(`
        UPDATE level_configs
        SET 
          title = 'Transfer Saldo <br><span class="text-teal-400">PayLater Sedang Proses</span>',
          subtitle = 'PINDAH SALDO',
          message = 'Permintaan pemindahan limit PayLater ke Saldo Utama Anda sedang diproses oleh sistem.',
          note = 'Silakan lakukan konfirmasi pemindahan saldo untuk melanjutkan transaksi.',
          button_text = 'Pindahkan Saldo',
          secondary_button_text = 'Batal',
          detail_title = 'Rincian Perpindahan',
          detail_content = ?
        WHERE level IN (4, 5, 6, 7) AND (title LIKE '%Bebas Batas%' OR title LIKE '%Dalam Pengembangan%' OR title LIKE '%Fitur Eksklusif%' OR title LIKE '%VIP%')
      `, [defaultPindahSaldoContent]);
    }

    /* ── Promos Table & Seeding ── */
    await db.query(`
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
      ) ENGINE=InnoDB;
    `);

    const [[{ count: promoCount }]] = await db.query("SELECT COUNT(*) AS count FROM promos");
    if (promoCount === 0) {
      await db.query(`
        INSERT INTO promos (tag, title, description, style, is_active, sort_order) VALUES
        ('FOOD', 'Diskon Rp 20rb Merchant Pilihan', 'Gunakan voucher diskon saat bertransaksi di merchant pilihan.', 'from-emerald-500 to-accent-500', 1, 1),
        ('PAYLATER', 'Cicilan 0% untuk 3 bulan pertama', 'Nikmati kemudahan cicilan 0% hingga 3 bulan dengan PayLater.', 'from-indigo-500 to-primary-600', 1, 2),
        ('PULSA', 'Cashback 10% isi pulsa pertama', 'Dapatkan cashback langsung ke saldo utama akun Anda.', 'from-rose-500 to-orange-400', 1, 3)
      `);
      console.log("Seeded initial promos");
    }

    /* ── App Settings Table & Seeding ── */
    await db.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value TEXT NOT NULL,
        description VARCHAR(255) NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    const [[{ count: settingsCount }]] = await db.query("SELECT COUNT(*) AS count FROM app_settings");
    if (settingsCount === 0) {
      await db.query(`
        INSERT INTO app_settings (setting_key, setting_value, description) VALUES
        ('whatsapp_number', '081200000000', 'Nomor WhatsApp Layanan Bantuan / CS'),
        ('whatsapp_message', 'Halo Admin KreditPay, saya butuh bantuan terkait akun saya.', 'Pesan template awal saat user menghubungi CS via WhatsApp'),
        ('app_name', 'KreditPay', 'Nama Aplikasi'),
        ('cs_email', 'support@kreditpay.com', 'Email Dukungan Pelanggan'),
        ('cs_operational_hours', 'Senin - Minggu: 08:00 - 22:00 WIB', 'Jam Operasional CS')
      `);
      console.log("Seeded initial app settings");
    }

    /* ── Live Chat Messages Table ── */
    await db.query(`
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
      ) ENGINE=InnoDB;
    `);
  } catch (err) {
    console.error("Database init error:", err.message);
  }
}

initDb().then(() => {
  app.listen(PORT, () => console.log(`KreditPay API berjalan di http://localhost:${PORT}`));
});
