require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const webPush = require("web-push");

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

const USER_NOTIF_WHERE =
  "channel IN ('web', 'both') AND ((target_type = 'all' AND user_id IS NULL) OR user_id = ? OR EXISTS (SELECT 1 FROM notification_targets nt WHERE nt.notification_id = notifications.id AND nt.user_id = ?))";

let vapidConfigCache = null;

async function ensureVapidConfig() {
  if (vapidConfigCache) return vapidConfigCache;

  const envPub = clean(process.env.VAPID_PUBLIC_KEY || "", 255);
  const envPriv = clean(process.env.VAPID_PRIVATE_KEY || "", 255);
  const envSubject = clean(process.env.VAPID_SUBJECT || "mailto:support@fastkredit.id", 150) || "mailto:support@fastkredit.id";

  if (envPub && envPriv) {
    webPush.setVapidDetails(envSubject, envPub, envPriv);
    vapidConfigCache = { publicKey: envPub, privateKey: envPriv, subject: envSubject };
    return vapidConfigCache;
  }

  const [rows] = await db.query(
    "SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ('vapid_public_key', 'vapid_private_key', 'vapid_subject')"
  );
  const map = rows.reduce((acc, r) => {
    acc[r.setting_key] = r.setting_value;
    return acc;
  }, {});

  let publicKey = map.vapid_public_key;
  let privateKey = map.vapid_private_key;
  const subject = map.vapid_subject || envSubject;

  if (!publicKey || !privateKey) {
    const generated = webPush.generateVAPIDKeys();
    publicKey = generated.publicKey;
    privateKey = generated.privateKey;
    await db.query(
      "INSERT INTO app_settings (setting_key, setting_value, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
      ["vapid_public_key", publicKey, "VAPID Public Key untuk Native Web Push Notification"]
    );
    await db.query(
      "INSERT INTO app_settings (setting_key, setting_value, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
      ["vapid_private_key", privateKey, "VAPID Private Key untuk Native Web Push Notification (rahasia)"]
    );
    await db.query(
      "INSERT IGNORE INTO app_settings (setting_key, setting_value, description) VALUES (?, ?, ?)",
      ["vapid_subject", subject, "VAPID Contact Subject untuk Native Web Push Notification"]
    );
  }

  webPush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigCache = { publicKey, privateKey, subject };
  return vapidConfigCache;
}

const sanitizePushUrl = (raw) => {
  const s = clean(raw || "", 255);
  if (!s) return "/app/notifikasi";
  if (s.startsWith("/") && !s.startsWith("//")) return s;
  try {
    const u = new URL(s);
    if (u.protocol === "https:" || u.protocol === "http:") return s;
  } catch {
    // fallback
  }
  return "/app/notifikasi";
};

async function sendPushToUsers(userIdsOrNull, payload, { onlyEndpoint = null } = {}) {
  try {
    await ensureVapidConfig();

    const params = [];
    let sql = `
      SELECT ps.id, ps.user_id, ps.endpoint, ps.p256dh, ps.auth
      FROM push_subscriptions ps
      JOIN users u ON u.id = ps.user_id
      WHERE u.is_blocked = 0
    `;

    if (onlyEndpoint) {
      sql += " AND ps.endpoint = ?";
      params.push(onlyEndpoint);
    }

    if (Array.isArray(userIdsOrNull)) {
      const cleanIds = [...new Set(userIdsOrNull.map((x) => parseInt(x, 10)).filter((n) => Number.isInteger(n) && n > 0))];
      if (cleanIds.length === 0) {
        return { sent: 0, failed: 0, totalTargets: 0 };
      }
      sql += ` AND ps.user_id IN (${cleanIds.map(() => "?").join(",")})`;
      params.push(...cleanIds);
    }

    const [subs] = await db.query(sql, params);
    if (!subs.length) {
      return { sent: 0, failed: 0, totalTargets: 0 };
    }

    const bodyJson = JSON.stringify({
      title: payload.title || "Fastkredit",
      body: payload.body || "",
      url: sanitizePushUrl(payload.url),
      notificationId: payload.notificationId || null,
      tag: payload.tag || (payload.notificationId ? `fk-notif-${payload.notificationId}` : `fk-push-${Date.now()}`),
      timestamp: Date.now(),
    });

    let sent = 0;
    let failed = 0;
    const staleIds = [];

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webPush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            bodyJson,
            { TTL: 86400 }
          );
          sent += 1;
        } catch (err) {
          failed += 1;
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            staleIds.push(sub.id);
          }
        }
      })
    );

    if (staleIds.length > 0) {
      await db.query(
        `DELETE FROM push_subscriptions WHERE id IN (${staleIds.map(() => "?").join(",")})`,
        staleIds
      ).catch(() => {});
    }

    return { sent, failed, totalTargets: subs.length };
  } catch (err) {
    console.warn("sendPushToUsers error:", err.message);
    return { sent: 0, failed: 0, totalTargets: 0 };
  }
}

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

const USER_FIELDS = "id,name,username,email,phone,role,level,avatar,balance,paylater_limit,paylater_used,account_id,device_id,device_fingerprint,is_blocked,blocked_reason,created_at";
const BLOCKED_DEVICE_MESSAGE = "Device tidak mendukung";
const resolveBlockedMessage = (reason) => {
  const cleaned = clean(reason, 255);
  if (!cleaned || /blokir/i.test(cleaned)) return BLOCKED_DEVICE_MESSAGE;
  return cleaned;
};
const findUser = async (id) => (await db.query(`SELECT ${USER_FIELDS} FROM users WHERE id=?`, [id]))[0][0];
const getClientDevice = (req) => {
  const rawId = req.body?.device_id ?? req.headers["x-device-id"] ?? "";
  const rawFp = req.body?.device_fingerprint ?? req.headers["x-device-fp"] ?? "";
  return {
    deviceId: clean(rawId, 128) || null,
    deviceFp: clean(rawFp, 128) || null,
  };
};
const findBlockedDevice = async (ids = [], fps = []) => {
  const idList = [...new Set((Array.isArray(ids) ? ids : [ids]).filter(Boolean))];
  const fpList = [...new Set((Array.isArray(fps) ? fps : [fps]).filter(Boolean))];
  const conds = [];
  const params = [];
  if (idList.length) {
    conds.push(`device_id IN (${idList.map(() => "?").join(",")})`);
    params.push(...idList);
  }
  if (fpList.length) {
    conds.push(`fingerprint IN (${fpList.map(() => "?").join(",")})`);
    params.push(...fpList);
  }
  if (!conds.length) return null;
  const [[row]] = await db.query(
    `SELECT id, device_id, fingerprint, reason FROM blocked_devices WHERE ${conds.join(" OR ")} LIMIT 1`,
    params
  );
  return row || null;
};
const getFirstActiveBankAccountName = async () => {
  try {
    const [[b]] = await db.query(
      "SELECT account_name FROM bank_accounts WHERE is_active=1 ORDER BY id ASC LIMIT 1"
    );
    return b?.account_name || null;
  } catch {
    return null;
  }
};
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

const auth = (roles) => async (req, res, next) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  try { req.user = jwt.verify(token, process.env.JWT_SECRET || "kreditpay-fallback-secret-2026"); }
  catch { return fail(res, 401, "Sesi berakhir, silakan masuk kembali"); }
  if (roles && !roles.includes(req.user.role)) return fail(res, 403, "Akses ditolak");

  try {
    const [[dbUser]] = await db.query(
      "SELECT id, role, is_blocked, blocked_reason, device_id, device_fingerprint FROM users WHERE id=? LIMIT 1",
      [req.user.id]
    );
    if (!dbUser) return fail(res, 401, "Akun tidak ditemukan");

    if (dbUser.role !== "admin") {
      if (dbUser.is_blocked) {
        return res.status(403).json({
          success: false,
          code: "ACCOUNT_BLOCKED",
          message: resolveBlockedMessage(dbUser.blocked_reason),
        });
      }

      const { deviceId, deviceFp } = getClientDevice(req);
      const blocked = await findBlockedDevice(
        [deviceId, dbUser.device_id],
        [deviceFp, dbUser.device_fingerprint]
      );
      if (blocked) {
        return res.status(403).json({
          success: false,
          code: "ACCOUNT_BLOCKED",
          message: resolveBlockedMessage(blocked.reason),
        });
      }

      if (
        (deviceId && deviceId !== dbUser.device_id) ||
        (deviceFp && deviceFp !== dbUser.device_fingerprint)
      ) {
        await db.query(
          "UPDATE users SET device_id = COALESCE(?, device_id), device_fingerprint = COALESCE(?, device_fingerprint) WHERE id = ?",
          [deviceId, deviceFp, dbUser.id]
        );
      }
    }
  } catch (e) {
    return next(e);
  }

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
  limits: { fileSize: 15 * 1024 * 1024, fieldSize: 15 * 1024 * 1024 },
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

  const { deviceId, deviceFp } = getClientDevice(req);
  const blocked = await findBlockedDevice([deviceId], [deviceFp]);
  if (blocked) {
    return res.status(403).json({
      success: false,
      code: "DEVICE_BLOCKED",
      message: resolveBlockedMessage(blocked.reason),
    });
  }

  const hash = await bcrypt.hash(data.pin, 10);
  const defaultAccountId = await getFirstActiveBankAccountName();
  const [r] = await db.query(
    "INSERT INTO users (name,username,email,phone,pin_hash,paylater_limit,account_id,device_id,device_fingerprint) VALUES (?,?,?,?,?,0,?,?,?)",
    [data.name, data.username, data.email, data.phone, hash, defaultAccountId, deviceId, deviceFp]
  );
  const user = await findUser(r.insertId);

  // Buat notifikasi personal selamat datang sesuai jam pendaftaran user
  try {
    await db.query(
      "INSERT INTO notifications (user_id, target_type, channel, title, body, created_at) VALUES (?, 'single', 'web', ?, ?, NOW())",
      [
        user.id,
        `Halo ${data.name}`,
        `Selamat datang di Fastkredit! Nikmati kemudahan bertransaksi dan ajukan pinjaman hingga Rp 500.000.000 dengan proses kilat tanpa ribet.`
      ]
    );
  } catch (err) {
    console.warn("Failed to create welcome notification:", err.message);
  }

  ok(res, { token: sign(user), user }, { message: "Pendaftaran berhasil" }, 201);
}));

app.post("/api/auth/login", wrap(async (req, res) => {
  const identifier = clean(req.body.identifier, 120).toLowerCase();
  const password = String(req.body.password ?? req.body.pin ?? "");
  if (!identifier || !password) return fail(res, 400, "Isi akun dan password");
  const [[row]] = await db.query(
    "SELECT id,role,pin_hash,is_blocked,blocked_reason,device_id,device_fingerprint FROM users WHERE username=? OR email=? OR phone=? LIMIT 1",
    [identifier, identifier, normPhone(identifier)]
  );
  if (!row || !(await bcrypt.compare(password, row.pin_hash))) return fail(res, 401, "Akun atau password salah");

  if (row.role !== "admin") {
    if (row.is_blocked) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_BLOCKED",
        message: resolveBlockedMessage(row.blocked_reason),
      });
    }

    const { deviceId, deviceFp } = getClientDevice(req);
    const blocked = await findBlockedDevice([deviceId, row.device_id], [deviceFp, row.device_fingerprint]);
    if (blocked) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_BLOCKED",
        message: resolveBlockedMessage(blocked.reason),
      });
    }

    if (
      (deviceId && deviceId !== row.device_id) ||
      (deviceFp && deviceFp !== row.device_fingerprint)
    ) {
      await db.query(
        "UPDATE users SET device_id = COALESCE(?, device_id), device_fingerprint = COALESCE(?, device_fingerprint) WHERE id = ?",
        [deviceId, deviceFp, row.id]
      );
    }
  }

  const user = await findUser(row.id);
  ok(res, { token: sign(user), user }, { message: "Berhasil masuk" });
}));

app.post("/api/auth/forgot-password/check", wrap(async (req, res) => {
  const email = clean(req.body.email, 120).toLowerCase();
  if (!email) return fail(res, 400, "Email wajib diisi");
  if (!rules.email(email)) return fail(res, 400, "Format email tidak valid");

  const [[row]] = await db.query(
    "SELECT id,name,username,email,role,is_blocked,blocked_reason,device_id,device_fingerprint FROM users WHERE LOWER(email)=? LIMIT 1",
    [email]
  );
  if (!row) return fail(res, 404, "Email tidak terdaftar");
  if (row.role === "admin") {
    return fail(res, 403, "Reset password hanya tersedia untuk akun pengguna");
  }
  if (row.is_blocked) {
    return res.status(403).json({
      success: false,
      code: "ACCOUNT_BLOCKED",
      message: resolveBlockedMessage(row.blocked_reason),
    });
  }

  const { deviceId, deviceFp } = getClientDevice(req);
  const blocked = await findBlockedDevice([deviceId, row.device_id], [deviceFp, row.device_fingerprint]);
  if (blocked) {
    return res.status(403).json({
      success: false,
      code: "ACCOUNT_BLOCKED",
      message: resolveBlockedMessage(blocked.reason),
    });
  }

  ok(res, {
    exists: true,
    email: row.email,
    name: row.name,
    username: row.username,
  }, { message: "Email ditemukan. Silakan buat password baru." });
}));

app.post("/api/auth/reset-password", wrap(async (req, res) => {
  const email = clean(req.body.email, 120).toLowerCase();
  const password = String(req.body.password ?? "");
  const confirmPassword =
    req.body.confirm_password !== undefined ? String(req.body.confirm_password) : undefined;

  if (!email) return fail(res, 400, "Email wajib diisi");
  if (!rules.email(email)) return fail(res, 400, "Format email tidak valid");
  if (!rules.password(password)) return fail(res, 400, "Password baru minimal 6 karakter");
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return fail(res, 400, "Konfirmasi password baru tidak sama");
  }

  const [[row]] = await db.query(
    "SELECT id,email,role,is_blocked,blocked_reason,device_id,device_fingerprint FROM users WHERE LOWER(email)=? LIMIT 1",
    [email]
  );
  if (!row) return fail(res, 404, "Email tidak terdaftar");
  if (row.role === "admin") {
    return fail(res, 403, "Reset password hanya tersedia untuk akun pengguna");
  }
  if (row.is_blocked) {
    return res.status(403).json({
      success: false,
      code: "ACCOUNT_BLOCKED",
      message: resolveBlockedMessage(row.blocked_reason),
    });
  }

  const { deviceId, deviceFp } = getClientDevice(req);
  const blocked = await findBlockedDevice([deviceId, row.device_id], [deviceFp, row.device_fingerprint]);
  if (blocked) {
    return res.status(403).json({
      success: false,
      code: "ACCOUNT_BLOCKED",
      message: resolveBlockedMessage(blocked.reason),
    });
  }

  const hash = await bcrypt.hash(password, 10);
  await db.query("UPDATE users SET pin_hash=? WHERE id=?", [hash, row.id]);

  ok(res, { email: row.email }, { message: "Password berhasil direset. Silakan masuk dengan password baru." });
}));

app.get("/api/auth/profile", userOnly, wrap(async (req, res) => {
  const user = await findUser(req.user.id);
  if (!user) return fail(res, 401, "Akun tidak ditemukan");
  ok(res, user);
}));

app.put("/api/auth/profile", userOnly, wrap(async (req, res) => {
  const { error, data } = parseUser(req.body, { pinRequired: false });
  if (error) return fail(res, 400, error);
  const sets = ["name=?", "username=?", "email=?", "phone=?"];
  const vals = [data.name, data.username, data.email, data.phone];
  if (data.pin) {
    sets.push("pin_hash=?");
    vals.push(await bcrypt.hash(data.pin, 10));
  }
  await db.query(`UPDATE users SET ${sets.join(",")} WHERE id=?`, [...vals, req.user.id]);
  ok(res, await findUser(req.user.id), { message: "Profil berhasil diperbarui" });
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

  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM notifications WHERE ${USER_NOTIF_WHERE}`,
    [req.user.id, req.user.id]
  );
  ok(res, {
    balance: user.balance,
    paylater: { limit: user.paylater_limit, used: user.paylater_used, available: user.paylater_limit - user.paylater_used },
    level: user.level,
    notifications: total,
  });
}));

/* ── Wallet ── */
app.post("/api/wallet/topup", userOnly, uploadProof.single("proof"), wrap(async (req, res) => {
  const amount = amountOf(req.body.amount);
  if (amount < 10000 || amount > 50000999) return fail(res, 400, "Nominal top up Rp10.000 - Rp50.000.000");

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
      if (u.paylater_limit - u.paylater_used < amount) throw new HttpError(400, "Limit Pinjaman tidak cukup");
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
  const [settingsRows] = await db.query(
    "SELECT setting_key, setting_value FROM app_settings WHERE setting_key LIKE 'letter_%' OR setting_key = 'app_name'"
  );
  const letter_template = settingsRows.reduce((acc, r) => {
    acc[r.setting_key] = r.setting_value;
    return acc;
  }, {});

  const [[userRow]] = await db.query(
    "SELECT id, name, username, level FROM users WHERE id=?",
    [req.user.id]
  );

  if (appRow) {
    ok(res, {
      ...appRow,
      user_info: userRow || null,
      letter_template,
    });
  } else {
    ok(res, {
      user_info: userRow || null,
      letter_template,
    });
  }
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
    ok(res, created, { message: "Pengajuan aktivasi Pinjaman berhasil dikirim!" });
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

const formatAccNotification = (userName, nominalStr, settings = {}) => {
  const appName = settings.app_name || "Fastkredit";
  let title = settings.notif_acc_title || "Pengajuan Pinjaman Disetujui (ACC)";
  let body = settings.notif_acc_message || "Selamat {name}! Pengajuan pinjaman Anda sebesar {nominal} telah disetujui (ACC) oleh tim {app_name}.\n\nSaldo limit pinjaman Anda sudah aktif dan dapat digunakan. Akun Anda kini berstatus Terverifikasi. Silakan cek saldo limit Anda di menu Beranda.";

  title = title
    .replace(/{name}/gi, userName)
    .replace(/{nominal}/gi, nominalStr)
    .replace(/{app_name}/gi, appName);

  body = body
    .replace(/{name}/gi, userName)
    .replace(/{nominal}/gi, nominalStr)
    .replace(/{app_name}/gi, appName);

  return { title, body };
};

app.put("/api/admin/paylater/:id/status", adminOnly, wrap(async (req, res) => {
  const status = clean(req.body.status, 20);
  const limitAmount = amountOf(req.body.limit) || 50000000;
  if (!["approved", "rejected", "pending"].includes(status)) return fail(res, 400, "Status tidak valid");

  await withTx(async (c) => {
    const [[appRow]] = await c.query("SELECT * FROM paylater_applications WHERE id=? FOR UPDATE", [req.params.id]);
    if (!appRow) throw new HttpError(404, "Pengajuan tidak ditemukan");

    await c.query("UPDATE paylater_applications SET status=? WHERE id=?", [status, req.params.id]);
    if (status === "approved") {
      await c.query(
        "UPDATE users SET paylater_limit=?, level=CASE WHEN level < 2 THEN 2 ELSE level END WHERE id=?",
        [limitAmount, appRow.user_id]
      );

      // Ambil template notifikasi kustom dari app_settings
      const [settingRows] = await c.query(
        "SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ('notif_acc_title', 'notif_acc_message', 'app_name')"
      );
      const sMap = settingRows.reduce((acc, r) => { acc[r.setting_key] = r.setting_value; return acc; }, {});

      const [[userRow]] = await c.query("SELECT name, username FROM users WHERE id=?", [appRow.user_id]);
      const userName = userRow?.name || appRow.full_name || "Nasabah";
      const nominalStr = `Rp ${Number(limitAmount).toLocaleString("id-ID")}`;

      const { title, body } = formatAccNotification(userName, nominalStr, sMap);

      await c.query(
        "INSERT INTO notifications (user_id, target_type, channel, title, body, created_at) VALUES (?, 'single', 'both', ?, ?, NOW())",
        [appRow.user_id, title, body]
      );
    } else if (status === "rejected") {
      await c.query(
        "INSERT INTO notifications (user_id, target_type, channel, title, body, created_at) VALUES (?, 'single', 'both', ?, ?, NOW())",
        [
          appRow.user_id,
          "Pengajuan Pinjaman Belum Disetujui",
          "Mohon maaf, pengajuan pinjaman Anda belum dapat disetujui saat ini. Silakan periksa kembali kelengkapan data pengajuan Anda atau hubungi layanan bantuan pelanggan Fastkredit."
        ]
      );
    }
  });

  if (status === "approved" || status === "rejected") {
    const [[latestNotif]] = await db.query(
      "SELECT id, title, body FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 1",
      [appRow.user_id]
    ).catch(() => [[]]);
    if (latestNotif) {
      sendPushToUsers([appRow.user_id], {
        title: latestNotif.title,
        body: latestNotif.body,
        url: "/app/notifikasi",
        notificationId: latestNotif.id,
      }).catch(() => {});
    }
  }

  ok(res, null, { message: `Pengajuan Pinjaman berhasil diubah ke status: ${status}` });
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

  // Ambil template notifikasi kustom dari app_settings
  const [settingRows] = await db.query(
    "SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ('notif_acc_title', 'notif_acc_message', 'app_name')"
  );
  const sMap = settingRows.reduce((acc, r) => { acc[r.setting_key] = r.setting_value; return acc; }, {});

  const approvedNotifs = [];
  await withTx(async (c) => {
    for (const app of applications) {
      const limitToSet = app.requested_amount > 0 ? Number(app.requested_amount) : fallbackLimit;
      await c.query("UPDATE paylater_applications SET status = 'approved' WHERE id = ?", [app.id]);
      await c.query(
        "UPDATE users SET paylater_limit = ?, level = CASE WHEN level < 2 THEN 2 ELSE level END WHERE id = ?",
        [limitToSet, app.user_id]
      );

      const [[userRow]] = await c.query("SELECT name FROM users WHERE id=?", [app.user_id]);
      const userName = userRow?.name || "Nasabah";
      const nominalStr = `Rp ${Number(limitToSet).toLocaleString("id-ID")}`;

      const { title, body } = formatAccNotification(userName, nominalStr, sMap);

      const [insNotif] = await c.query(
        "INSERT INTO notifications (user_id, target_type, channel, title, body, created_at) VALUES (?, 'single', 'both', ?, ?, NOW())",
        [app.user_id, title, body]
      );
      approvedNotifs.push({ user_id: app.user_id, title, body, id: insNotif.insertId });
    }
  });

  Promise.allSettled(
    approvedNotifs.map((n) =>
      sendPushToUsers([n.user_id], { title: n.title, body: n.body, url: "/app/notifikasi", notificationId: n.id })
    )
  ).catch(() => {});

  ok(res, { count: applications.length }, {
    message: `Berhasil menyetujui (ACC) ${applications.length} pengajuan Pinjaman sekaligus!`,
  });
}));

// Admin: Bulk Reject
app.post("/api/admin/paylater/bulk-reject", adminOnly, wrap(async (req, res) => {
  const { ids, all_pending } = req.body || {};

  let applications = [];
  if (all_pending) {
    const [rows] = await db.query(
      "SELECT id, user_id FROM paylater_applications WHERE status = 'pending'"
    );
    applications = rows;
  } else if (Array.isArray(ids) && ids.length > 0) {
    const cleanIds = ids.map((id) => parseInt(id)).filter(Boolean);
    if (cleanIds.length === 0) return fail(res, 400, "Daftar ID tidak valid");
    const [rows] = await db.query(
      `SELECT id, user_id FROM paylater_applications WHERE id IN (?) AND status = 'pending'`,
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
  const rejectTitle = "Pengajuan Pinjaman Belum Disetujui";
  const rejectBody = "Mohon maaf, pengajuan pinjaman Anda belum dapat disetujui saat ini. Silakan periksa kembali kelengkapan data pengajuan Anda atau hubungi layanan bantuan pelanggan Fastkredit.";
  const rejectedNotifs = [];
  for (const a of applications) {
    if (a.user_id) {
      const [insNotif] = await db.query(
        "INSERT INTO notifications (user_id, target_type, channel, title, body) VALUES (?, 'single', 'both', ?, ?)",
        [a.user_id, rejectTitle, rejectBody]
      );
      rejectedNotifs.push({ user_id: a.user_id, id: insNotif.insertId });
    }
  }

  Promise.allSettled(
    rejectedNotifs.map((n) =>
      sendPushToUsers([n.user_id], { title: rejectTitle, body: rejectBody, url: "/app/notifikasi", notificationId: n.id })
    )
  ).catch(() => {});

  ok(res, { count: applications.length }, {
    message: `Berhasil menolak ${applications.length} pengajuan Pinjaman.`,
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
  paginate(req, res, {
    from: "notifications",
    select: "id,user_id,title,body,channel,target_type,click_url,created_at",
    searchCols: ["title", "body"],
    sortable: NOTIF_SORT,
    defaultSort: "created_at",
    baseWhere: [USER_NOTIF_WHERE],
    baseParams: [req.user.id, req.user.id],
  })
));

/* ── Native Web Push Subscriptions (User) ── */
app.get("/api/push/vapid-public-key", wrap(async (req, res) => {
  const { publicKey } = await ensureVapidConfig();
  ok(res, { publicKey });
}));

app.get("/api/push/status", userOnly, wrap(async (req, res) => {
  const endpoint = clean(req.query.endpoint || "", 500);
  const [[{ total }]] = await db.query(
    "SELECT COUNT(*) AS total FROM push_subscriptions WHERE user_id = ?",
    [req.user.id]
  );
  let currentRegistered = false;
  if (endpoint) {
    const [[row]] = await db.query(
      "SELECT id FROM push_subscriptions WHERE user_id = ? AND endpoint = ? LIMIT 1",
      [req.user.id, endpoint]
    );
    currentRegistered = Boolean(row);
  }
  ok(res, { totalDevices: Number(total || 0), currentRegistered });
}));

app.post("/api/push/subscribe", userOnly, wrap(async (req, res) => {
  const body = req.body || {};
  const endpoint = String(body.endpoint || "").trim().slice(0, 500);
  const p256dh = String(body.keys?.p256dh || "").trim().slice(0, 255);
  const authKey = String(body.keys?.auth || "").trim().slice(0, 255);
  const userAgent = clean(req.headers["user-agent"] || body.userAgent || "", 255) || null;

  if (!endpoint || !endpoint.startsWith("https://") || !p256dh || !authKey) {
    return fail(res, 400, "Data subscription push tidak valid");
  }

  await db.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       user_id = VALUES(user_id),
       p256dh = VALUES(p256dh),
       auth = VALUES(auth),
       user_agent = VALUES(user_agent),
       updated_at = NOW()`,
    [req.user.id, endpoint, p256dh, authKey, userAgent]
  );

  ok(res, { subscribed: true }, { message: "Push notification berhasil diaktifkan di perangkat ini" });
}));

app.post("/api/push/unsubscribe", userOnly, wrap(async (req, res) => {
  const endpoint = String(req.body?.endpoint || "").trim().slice(0, 500);
  if (endpoint) {
    await db.query("DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?", [req.user.id, endpoint]);
  }
  ok(res, { subscribed: false }, { message: "Push notification di perangkat ini dinonaktifkan" });
}));

app.post("/api/push/test", userOnly, wrap(async (req, res) => {
  const endpoint = String(req.body?.endpoint || "").trim().slice(0, 500) || null;
  const stats = await sendPushToUsers(
    [req.user.id],
    {
      title: "Notifikasi Fastkredit Aktif!",
      body: "Perangkat Anda siap menerima info promo, status pengajuan, dan pengumuman penting.",
      url: "/app/notifikasi",
      tag: `fk-test-${req.user.id}`,
    },
    { onlyEndpoint: endpoint }
  );
  if (stats.totalTargets === 0) {
    return fail(res, 400, "Perangkat ini belum terdaftar untuk push notification");
  }
  if (stats.sent === 0) {
    return fail(res, 500, "Gagal mengirim uji notifikasi push ke perangkat");
  }
  ok(res, stats, { message: "Tes push notification berhasil dikirim ke perangkat ini" });
}));

/* ── Admin: Users ── */
app.get("/api/admin/users", adminOnly, wrap((req, res) =>
  paginate(req, res, {
    from: "users",
    select: `${USER_FIELDS}, EXISTS(SELECT 1 FROM blocked_devices b WHERE (users.device_id IS NOT NULL AND users.device_id <> '' AND b.device_id = users.device_id) OR (users.device_fingerprint IS NOT NULL AND users.device_fingerprint <> '' AND b.fingerprint = users.device_fingerprint)) AS is_device_blocked, (SELECT COUNT(*) FROM push_subscriptions ps WHERE ps.user_id = users.id) AS push_count`,
    searchCols: ["name", "username", "email", "phone", "account_id", "device_id"],
    sortable: { created_at: "created_at", name: "name", username: "username", level: "level", balance: "balance", account_id: "account_id", is_blocked: "is_blocked" },
    defaultSort: "created_at",
    filters: { role: "role", is_blocked: "is_blocked", level: "level" },
  })
));

app.put("/api/admin/users/:id/status", adminOnly, wrap(async (req, res) => {
  const userId = Number(req.params.id);
  if (userId === req.user.id) return fail(res, 400, "Tidak dapat memblokir akun Admin sendiri");

  const isBlocked = req.body.is_blocked ? 1 : 0;
  const blockDevice = !!req.body.block_device;
  const customDeviceId = clean(req.body.device_id || "", 128) || null;
  const reason = clean(req.body.reason || "", 255) || (isBlocked || blockDevice ? BLOCKED_DEVICE_MESSAGE : null);

  const updatedUser = await withTx(async (c) => {
    const [[target]] = await c.query("SELECT * FROM users WHERE id=? FOR UPDATE", [userId]);
    if (!target) throw new HttpError(404, "Pengguna tidak ditemukan");
    if (target.role === "admin" && (isBlocked || blockDevice)) {
      throw new HttpError(400, "Tidak dapat memblokir akun Admin");
    }

    const targetDeviceId = customDeviceId || target.device_id || null;
    const targetFp = target.device_fingerprint || null;

    await c.query(
      "UPDATE users SET is_blocked=?, blocked_reason=?, device_id=? WHERE id=?",
      [isBlocked, isBlocked ? reason : null, targetDeviceId, userId]
    );

    if (blockDevice) {
      if (!targetDeviceId && !targetFp) {
        throw new HttpError(400, "ID Perangkat / IMEI pengguna belum tercatat. Isi IMEI/Device ID secara manual atau tunggu pengguna login terlebih dahulu.");
      }
      if (targetDeviceId) {
        await c.query(
          `INSERT INTO blocked_devices (device_id, fingerprint, user_id, reason, blocked_by)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             fingerprint = COALESCE(VALUES(fingerprint), fingerprint),
             user_id = VALUES(user_id),
             reason = VALUES(reason),
             blocked_by = VALUES(blocked_by)`,
          [targetDeviceId, targetFp, userId, reason || BLOCKED_DEVICE_MESSAGE, req.user.id]
        );
      } else if (targetFp) {
        const [[existingFp]] = await c.query("SELECT id FROM blocked_devices WHERE fingerprint=? LIMIT 1", [targetFp]);
        if (!existingFp) {
          await c.query(
            "INSERT INTO blocked_devices (device_id, fingerprint, user_id, reason, blocked_by) VALUES (NULL, ?, ?, ?, ?)",
            [targetFp, userId, reason || BLOCKED_DEVICE_MESSAGE, req.user.id]
          );
        }
      }
    } else {
      const conds = ["user_id = ?"];
      const params = [userId];
      if (targetDeviceId) {
        conds.push("device_id = ?");
        params.push(targetDeviceId);
      }
      if (targetFp) {
        conds.push("fingerprint = ?");
        params.push(targetFp);
      }
      await c.query(`DELETE FROM blocked_devices WHERE ${conds.join(" OR ")}`, params);
    }

    const [[fresh]] = await c.query(
      `SELECT ${USER_FIELDS}, EXISTS(SELECT 1 FROM blocked_devices b WHERE (users.device_id IS NOT NULL AND users.device_id <> '' AND b.device_id = users.device_id) OR (users.device_fingerprint IS NOT NULL AND users.device_fingerprint <> '' AND b.fingerprint = users.device_fingerprint)) AS is_device_blocked FROM users WHERE id=?`,
      [userId]
    );
    return fresh;
  });

  const statusMsg = isBlocked
    ? blockDevice
      ? "Akun & IMEI perangkat berhasil diblokir"
      : "Akun berhasil diblokir"
    : blockDevice
    ? "IMEI perangkat diblokir (daftar ulang dicegah)"
    : "Status akun & perangkat diaktifkan kembali";

  ok(res, updatedUser, { message: statusMsg });
}));

const adminUserExtras = (b) => ({
  role: b.role === "admin" ? "admin" : "user",
  level: [1, 2, 3, 4, 5, 6, 7].includes(Number(b.level)) ? Number(b.level) : 1,
  balance: money(b.balance),
  paylater_limit: money(b.paylater_limit),
  account_id: b.account_id !== undefined ? clean(String(b.account_id || ""), 100) : undefined,
});

app.get("/api/admin/users/default-account-id", adminOnly, wrap(async (req, res) => {
  const account_name = await getFirstActiveBankAccountName();
  ok(res, { account_name });
}));

app.post("/api/admin/users/apply-all-account-id", adminOnly, wrap(async (req, res) => {
  let targetId = req.body.account_id ? clean(String(req.body.account_id), 100) : null;
  if (!targetId) {
    targetId = await getFirstActiveBankAccountName();
  }
  if (!targetId) {
    return fail(res, 400, "Tidak ada Nomor ID Akun atau rekening aktif yang ditemukan");
  }

  const [r] = await db.query("UPDATE users SET account_id = ?", [targetId]);
  ok(res, {
    account_id: targetId,
    affectedRows: r.affectedRows,
  }, {
    message: `Berhasil mengubah Nomor ID Akun untuk ${r.affectedRows} pengguna menjadi "${targetId}"`
  });
}));

app.post("/api/admin/users", adminOnly, wrap(async (req, res) => {
  const { error, data } = parseUser(req.body, { pinRequired: true });
  if (error) return fail(res, 400, error);
  const x = adminUserExtras(req.body);
  const targetAccountId = x.account_id || (await getFirstActiveBankAccountName());
  const hash = await bcrypt.hash(data.pin, 10);
  const [r] = await db.query(
    "INSERT INTO users (name,username,email,phone,pin_hash,role,level,balance,paylater_limit,account_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
    [data.name, data.username, data.email, data.phone, hash, x.role, x.level, x.balance, x.paylater_limit, targetAccountId]
  );
  if (x.role === "user") {
    try {
      await db.query(
        "INSERT INTO notifications (user_id, target_type, channel, title, body, created_at) VALUES (?, 'single', 'web', ?, ?, NOW())",
        [
          r.insertId,
          `Halo ${data.name}`,
          `Selamat datang di Fastkredit! Nikmati kemudahan bertransaksi dan ajukan pinjaman hingga Rp 500.000.000 dengan proses kilat tanpa ribet.`
        ]
      );
    } catch {}
  }
  ok(res, null, { message: "Pengguna ditambahkan" }, 201);
}));

app.put("/api/admin/users/:id", adminOnly, wrap(async (req, res) => {
  const { error, data } = parseUser(req.body, { pinRequired: false });
  if (error) return fail(res, 400, error);
  const x = adminUserExtras(req.body);
  const sets = ["name=?", "username=?", "email=?", "phone=?", "role=?", "level=?", "balance=?", "paylater_limit=?"];
  const vals = [data.name, data.username, data.email, data.phone, x.role, x.level, x.balance, x.paylater_limit];
  if (x.account_id !== undefined) {
    sets.push("account_id=?");
    vals.push(x.account_id || null);
  }
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

/* ── Admin: Notifications & Web Push Broadcast ── */
const ADMIN_NOTIF_SORT = { created_at: "n.created_at", title: "n.title", push_sent: "n.push_sent" };
app.get("/api/admin/notifications", adminOnly, wrap((req, res) =>
  paginate(req, res, {
    from: "notifications n LEFT JOIN users u ON u.id = n.user_id",
    select: `
      n.id, n.user_id, n.title, n.body, n.channel, n.target_type, n.click_url, n.push_sent, n.push_failed, n.created_at,
      u.name AS target_user_name, u.username AS target_username,
      (SELECT COUNT(*) FROM notification_targets nt WHERE nt.notification_id = n.id) AS target_count,
      (SELECT GROUP_CONCAT(CONCAT(tu.name, ' (@', tu.username, ')') ORDER BY tu.name SEPARATOR ', ')
       FROM notification_targets nt JOIN users tu ON tu.id = nt.user_id
       WHERE nt.notification_id = n.id) AS target_users_label
    `,
    searchCols: ["n.title", "n.body", "u.name", "u.username"],
    sortable: ADMIN_NOTIF_SORT,
    defaultSort: "created_at",
    filters: { channel: "n.channel", target_type: "n.target_type" },
  })
));

app.get("/api/admin/push/stats", adminOnly, wrap(async (req, res) => {
  await ensureVapidConfig();
  const [[subStats]] = await db.query(`
    SELECT
      COUNT(ps.id) AS total_devices,
      COUNT(DISTINCT ps.user_id) AS subscribed_users
    FROM push_subscriptions ps
    JOIN users u ON u.id = ps.user_id
    WHERE u.is_blocked = 0
  `);
  const [[userStats]] = await db.query(
    "SELECT COUNT(*) AS total_users FROM users WHERE role = 'user' AND is_blocked = 0"
  );
  ok(res, {
    totalDevices: Number(subStats?.total_devices || 0),
    subscribedUsers: Number(subStats?.subscribed_users || 0),
    totalActiveUsers: Number(userStats?.total_users || 0),
  });
}));

const parseNotif = (b = {}) => {
  const title = clean(b.title, 150);
  const body = clean(b.body, 2000);
  if (title.length < 3) return { error: "Judul minimal 3 karakter" };
  if (body.length < 3) return { error: "Isi pesan minimal 3 karakter" };

  const channel = ["web", "push", "both"].includes(b.channel) ? b.channel : "both";
  const target_type = ["all", "single", "multiple"].includes(b.target_type) ? b.target_type : "all";
  const rawIds = Array.isArray(b.user_ids)
    ? b.user_ids
    : b.user_id
    ? [b.user_id]
    : [];
  const user_ids = [...new Set(rawIds.map((x) => parseInt(x, 10)).filter((n) => Number.isInteger(n) && n > 0))];

  if (target_type === "single" && user_ids.length !== 1) {
    return { error: "Pilih 1 user tujuan untuk target User Tertentu" };
  }
  if (target_type === "multiple" && user_ids.length < 1) {
    return { error: "Pilih minimal 1 user untuk target Beberapa User" };
  }

  const click_url = sanitizePushUrl(b.click_url);
  return { title, body, channel, target_type, user_ids, click_url };
};

app.post("/api/admin/notifications", adminOnly, wrap(async (req, res) => {
  const parsed = parseNotif(req.body);
  if (parsed.error) return fail(res, 400, parsed.error);

  let validUserIds = [];
  if (parsed.target_type !== "all") {
    const [foundUsers] = await db.query(
      `SELECT id FROM users WHERE id IN (${parsed.user_ids.map(() => "?").join(",")})`,
      parsed.user_ids
    );
    validUserIds = foundUsers.map((u) => u.id);
    if (validUserIds.length === 0) {
      return fail(res, 400, "Pengguna tujuan tidak ditemukan");
    }
  }

  const singleUserId = parsed.target_type === "single" ? validUserIds[0] : null;
  const notifId = await withTx(async (c) => {
    const [ins] = await c.query(
      "INSERT INTO notifications (user_id, title, body, channel, target_type, click_url) VALUES (?, ?, ?, ?, ?, ?)",
      [singleUserId, parsed.title, parsed.body, parsed.channel, parsed.target_type, parsed.click_url]
    );
    if (parsed.target_type === "multiple" && validUserIds.length > 0) {
      const placeholders = validUserIds.map(() => "(?, ?)").join(",");
      const vals = validUserIds.flatMap((uid) => [ins.insertId, uid]);
      await c.query(
        `INSERT IGNORE INTO notification_targets (notification_id, user_id) VALUES ${placeholders}`,
        vals
      );
    }
    return ins.insertId;
  });

  let pushStats = { sent: 0, failed: 0, totalTargets: 0 };
  if (parsed.channel === "both" || parsed.channel === "push") {
    const targetIds = parsed.target_type === "all" ? null : validUserIds;
    pushStats = await sendPushToUsers(targetIds, {
      title: parsed.title,
      body: parsed.body,
      url: parsed.click_url,
      notificationId: notifId,
    });
    await db.query("UPDATE notifications SET push_sent=?, push_failed=? WHERE id=?", [
      pushStats.sent,
      pushStats.failed,
      notifId,
    ]);
  }

  const targetText =
    parsed.target_type === "all"
      ? "semua pengguna"
      : `${validUserIds.length} pengguna terpilih`;
  let message = `Broadcast dikirim ke ${targetText}`;
  if (parsed.channel === "both" || parsed.channel === "push") {
    message =
      pushStats.totalTargets > 0
        ? `Broadcast dikirim ke ${targetText} (${pushStats.sent} perangkat push menerima notifikasi)`
        : `Broadcast tersimpan untuk ${targetText} (belum ada perangkat target yang mengaktifkan izin Push)`;
  }

  ok(
    res,
    {
      id: notifId,
      channel: parsed.channel,
      target_type: parsed.target_type,
      recipients_count: parsed.target_type === "all" ? null : validUserIds.length,
      push_sent: pushStats.sent,
      push_failed: pushStats.failed,
      total_push_targets: pushStats.totalTargets,
    },
    { message },
    201
  );
}));

app.put("/api/admin/notifications/:id", adminOnly, wrap(async (req, res) => {
  const title = clean(req.body?.title, 150);
  const body = clean(req.body?.body, 2000);
  if (title.length < 3) return fail(res, 400, "Judul minimal 3 karakter");
  if (body.length < 3) return fail(res, 400, "Isi pesan minimal 3 karakter");
  const clickUrl = sanitizePushUrl(req.body?.click_url);

  const [r] = await db.query(
    "UPDATE notifications SET title=?, body=?, click_url=? WHERE id=?",
    [title, body, clickUrl, req.params.id]
  );
  if (!r.affectedRows) return fail(res, 404, "Notifikasi tidak ditemukan");
  ok(res, null, { message: "Notifikasi diperbarui" });
}));

app.post("/api/admin/notifications/:id/resend-push", adminOnly, wrap(async (req, res) => {
  const [[notif]] = await db.query(
    "SELECT id, user_id, title, body, target_type, click_url FROM notifications WHERE id=? LIMIT 1",
    [req.params.id]
  );
  if (!notif) return fail(res, 404, "Notifikasi tidak ditemukan");

  let targetIds = null;
  if (notif.target_type === "single" && notif.user_id) {
    targetIds = [notif.user_id];
  } else if (notif.target_type === "multiple") {
    const [rows] = await db.query(
      "SELECT user_id FROM notification_targets WHERE notification_id=?",
      [notif.id]
    );
    targetIds = rows.map((r) => r.user_id);
  } else if (notif.user_id) {
    targetIds = [notif.user_id];
  }

  const pushStats = await sendPushToUsers(targetIds, {
    title: notif.title,
    body: notif.body,
    url: notif.click_url || "/app/notifikasi",
    notificationId: notif.id,
  });

  await db.query(
    "UPDATE notifications SET push_sent = push_sent + ?, push_failed = push_failed + ? WHERE id = ?",
    [pushStats.sent, pushStats.failed, notif.id]
  );

  const msg =
    pushStats.totalTargets > 0
      ? `Push dikirim ulang ke ${pushStats.sent} dari ${pushStats.totalTargets} perangkat terdaftar`
      : "Belum ada perangkat target yang mengaktifkan izin Push Notification";
  ok(res, pushStats, { message: msg });
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
  const [[cnt]] = await db.query("SELECT COUNT(*) AS total FROM bank_accounts");
  if (Number(cnt?.total || 0) >= 1) {
    return fail(res, 400, "Hanya diperbolehkan 1 data rekening bank. Silakan edit data rekening yang sudah ada.");
  }
  const { error, data } = parseBank(req.body);
  if (error) return fail(res, 400, error);
  const [r] = await db.query(
    "INSERT INTO bank_accounts (bank_name, account_number, account_name, is_active) VALUES (?,?,?,?)",
    [data.bank_name, data.account_number, data.account_name, data.is_active]
  );
  if (data.is_active) {
    await db.query("UPDATE users SET account_id = ? WHERE role = 'user'", [data.account_name]);
  }
  ok(res, { id: r.insertId, ...data }, { message: "Rekening bank berhasil ditambahkan" + (data.is_active ? " dan ID Akun pengguna disinkronkan" : "") }, 201);
}));

app.put("/api/admin/banks/:id", adminOnly, wrap(async (req, res) => {
  const { error, data } = parseBank(req.body);
  if (error) return fail(res, 400, error);
  const [r] = await db.query(
    "UPDATE bank_accounts SET bank_name=?, account_number=?, account_name=?, is_active=? WHERE id=?",
    [data.bank_name, data.account_number, data.account_name, data.is_active, req.params.id]
  );
  if (!r.affectedRows) return fail(res, 404, "Rekening bank tidak ditemukan");

  // Jika rekening diubah, user id otomatis mengikut dengan nama rekening aktif
  if (data.is_active) {
    await db.query("UPDATE users SET account_id = ? WHERE role = 'user'", [data.account_name]);
  } else {
    const activeName = await getFirstActiveBankAccountName();
    if (activeName) {
      await db.query("UPDATE users SET account_id = ? WHERE role = 'user'", [activeName]);
    }
  }

  ok(res, null, { message: `Rekening bank diperbarui & ID seluruh user otomatis diubah menjadi "${data.account_name}"` });
}));

app.delete("/api/admin/banks/:id", adminOnly, wrap(async (req, res) => {
  const [r] = await db.query("DELETE FROM bank_accounts WHERE id=?", [req.params.id]);
  if (!r.affectedRows) return fail(res, 404, "Rekening bank tidak ditemukan");
  
  const activeName = await getFirstActiveBankAccountName();
  if (activeName) {
    await db.query("UPDATE users SET account_id = ? WHERE role = 'user'", [activeName]);
  }

  ok(res, null, { message: "Rekening bank berhasil dihapus" });
}));

/* ── Admin: Transactions ── */
app.get("/api/admin/transactions", adminOnly, wrap((req, res) =>
  paginate(req, res, {
    from: "transactions t JOIN users u ON u.id = t.user_id",
    select: "t.id,t.type,t.title,t.amount,t.source,t.status,t.reference,t.target,t.proof,t.created_at,u.username,u.name as user_name",
    searchCols: ["t.title", "t.reference", "u.username", "u.name", "t.target"],
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
  const [rows] = await db.query("SELECT setting_key, setting_value FROM app_settings WHERE setting_key NOT IN ('vapid_private_key')");
  const settings = rows.reduce((acc, r) => {
    if (r.setting_key === "vapid_private_key" || r.setting_key === "vapid_public_key" || r.setting_key === "vapid_subject") {
      return acc;
    }
    acc[r.setting_key] = r.setting_value;
    return acc;
  }, {});
  const whatsapp_number = settings.whatsapp_number || "081234567890";
  const whatsapp_message = settings.whatsapp_message || "Halo Admin Fastkredit, saya butuh bantuan terkait akun saya.";
  const whatsapp_url = formatWhatsAppUrl(whatsapp_number, whatsapp_message);
  const web_app_url = settings.web_app_url || "https://kreditpay.id";
  const show_wa_cs_profile = String(settings.show_wa_cs_profile || "0") === "1" ? "1" : "0";
  ok(res, {
    ...settings,
    whatsapp_number,
    whatsapp_message,
    whatsapp_url,
    web_app_url,
    show_wa_cs_profile,
  });
}));

app.get("/api/settings/web-url", wrap(async (req, res) => {
  const [[row]] = await db.query(
    "SELECT setting_value FROM app_settings WHERE setting_key = 'web_app_url' LIMIT 1"
  );
  ok(res, {
    web_app_url: row?.setting_value || "https://kreditpay.id",
  });
}));

app.get("/api/admin/settings", adminOnly, wrap(async (req, res) => {
  const [rows] = await db.query("SELECT setting_key, setting_value, description, updated_at FROM app_settings WHERE setting_key NOT IN ('vapid_private_key')");
  const settings = rows.reduce((acc, r) => {
    acc[r.setting_key] = r.setting_value;
    return acc;
  }, {});
  settings.show_wa_cs_profile = String(settings.show_wa_cs_profile || "0") === "1" ? "1" : "0";
  const whatsapp_number = settings.whatsapp_number || "081234567890";
  const whatsapp_message = settings.whatsapp_message || "Halo Admin Fastkredit, saya butuh bantuan terkait akun saya.";
  const whatsapp_url = formatWhatsAppUrl(whatsapp_number, whatsapp_message);
  ok(res, {
    settings,
    whatsapp_url,
    items: rows,
  });
}));

app.put("/api/admin/settings", adminOnly, wrap(async (req, res) => {
  const body = req.body || {};
  const allowed = [
    "whatsapp_number",
    "whatsapp_message",
    "show_wa_cs_profile",
    "web_app_url",
    "app_name",
    "cs_email",
    "cs_operational_hours",
    "notif_acc_title",
    "notif_acc_message",
    "letter_layout_model",
    "letter_company_name",
    "letter_title",
    "letter_number_prefix",
    "letter_opening",
    "letter_rules_min_topup",
    "letter_rules_content",
    "letter_closing",
    "letter_signer",
    "letter_important_notes",
  ];
  for (const key of allowed) {
    if (body[key] !== undefined) {
      const val =
        key === "show_wa_cs_profile"
          ? body[key] === true || body[key] === 1 || String(body[key]) === "1"
            ? "1"
            : "0"
          : clean(String(body[key]), 6000);
      await db.query(
        "INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
        [key, val]
      );
    }
  }
  const [rows] = await db.query("SELECT setting_key, setting_value FROM app_settings WHERE setting_key NOT IN ('vapid_private_key')");
  const settings = rows.reduce((acc, r) => {
    acc[r.setting_key] = r.setting_value;
    return acc;
  }, {});
  settings.show_wa_cs_profile = String(settings.show_wa_cs_profile || "0") === "1" ? "1" : "0";
  const whatsapp_number = settings.whatsapp_number || "081234567890";
  const whatsapp_message = settings.whatsapp_message || "Halo Admin Fastkredit, saya butuh bantuan terkait akun saya.";
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
      await db.query("ALTER TABLE users ADD COLUMN account_id VARCHAR(100) NULL AFTER phone");
    } catch {
      // Kolom account_id sudah ada
    }

    const userDeviceAlterCols = [
      "ALTER TABLE users ADD COLUMN device_id VARCHAR(128) NULL AFTER account_id",
      "ALTER TABLE users ADD COLUMN device_fingerprint VARCHAR(128) NULL AFTER device_id",
      "ALTER TABLE users ADD COLUMN is_blocked TINYINT(1) NOT NULL DEFAULT 0 AFTER level",
      "ALTER TABLE users ADD COLUMN blocked_reason VARCHAR(255) NULL AFTER is_blocked",
      "ALTER TABLE users ADD INDEX idx_users_device_id (device_id)",
      "ALTER TABLE users ADD INDEX idx_users_device_fp (device_fingerprint)",
      "ALTER TABLE users ADD INDEX idx_users_blocked (is_blocked)",
    ];
    for (const sql of userDeviceAlterCols) {
      try { await db.query(sql); } catch {}
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS blocked_devices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        device_id VARCHAR(128) NULL,
        fingerprint VARCHAR(128) NULL,
        user_id INT NULL,
        reason VARCHAR(255) NULL,
        blocked_by INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_blocked_device_id (device_id),
        INDEX idx_blocked_fp (fingerprint),
        INDEX idx_blocked_user (user_id),
        CONSTRAINT fk_blocked_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    try {
      await db.query(`
        UPDATE users u
        CROSS JOIN (
          SELECT account_name FROM bank_accounts WHERE is_active=1 ORDER BY id ASC LIMIT 1
        ) b
        SET u.account_id = b.account_name
        WHERE (u.account_id IS NULL OR u.account_id = '') AND u.role = 'user'
      `);
    } catch {
      // ignore
    }

    try {
      await db.query("ALTER TABLE notifications ADD COLUMN user_id INT NULL AFTER id");
    } catch {
      // Kolom user_id sudah ada
    }
    try {
      await db.query("ALTER TABLE notifications ADD INDEX idx_notif_user (user_id)");
    } catch {
      // Index user_id sudah ada
    }
    const notifExtraCols = [
      "ADD COLUMN channel ENUM('web','push','both') NOT NULL DEFAULT 'web' AFTER body",
      "ADD COLUMN target_type ENUM('all','single','multiple') NOT NULL DEFAULT 'all' AFTER channel",
      "ADD COLUMN click_url VARCHAR(255) NULL DEFAULT '/app/notifikasi' AFTER target_type",
      "ADD COLUMN push_sent INT NOT NULL DEFAULT 0 AFTER click_url",
      "ADD COLUMN push_failed INT NOT NULL DEFAULT 0 AFTER push_sent",
    ];
    for (const colDef of notifExtraCols) {
      try {
        await db.query(`ALTER TABLE notifications ${colDef}`);
      } catch {
        // Kolom sudah ada
      }
    }
    try {
      await db.query("UPDATE notifications SET target_type = 'single' WHERE user_id IS NOT NULL AND target_type = 'all'");
    } catch {
      // ignore
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS notification_targets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        notification_id INT NOT NULL,
        user_id INT NOT NULL,
        UNIQUE KEY uniq_notif_user (notification_id, user_id),
        INDEX idx_nt_user (user_id),
        CONSTRAINT fk_nt_notif FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
        CONSTRAINT fk_nt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    await db.query(`
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
    `);

    // Bersihkan notifikasi generic lama dan backfill notifikasi sapaan personal sesuai jam pendaftaran
    try {
      await db.query("DELETE FROM notifications WHERE user_id IS NULL AND title = 'Halo semua'");
      await db.query(`
        INSERT INTO notifications (user_id, target_type, channel, title, body, created_at)
        SELECT 
          u.id,
          'single',
          'web',
          CONCAT('Halo ', u.name),
          CONCAT('Selamat datang di Fastkredit! Nikmati kemudahan bertransaksi dan ajukan pinjaman hingga Rp 500.000.000 dengan proses kilat tanpa ribet.'),
          u.created_at
        FROM users u
        WHERE u.role = 'user'
          AND NOT EXISTS (
            SELECT 1 FROM notifications n 
            WHERE n.user_id = u.id AND n.title LIKE 'Halo%'
          )
      `);
    } catch {
      // ignore
    }

    // Perbarui nama aplikasi KreditPay menjadi Fastkredit pada database
    try {
      await db.query(`
        UPDATE app_settings 
        SET setting_value = REPLACE(setting_value, 'KreditPay', 'Fastkredit')
        WHERE setting_value LIKE '%KreditPay%'
      `);
      await db.query(`
        UPDATE app_settings 
        SET setting_value = REPLACE(setting_value, 'KREDITPAY', 'FASTKREDIT')
        WHERE setting_value LIKE '%KREDITPAY%'
      `);
      await db.query(`
        UPDATE app_settings 
        SET setting_value = REPLACE(setting_value, 'kreditpay', 'fastkredit')
        WHERE setting_value LIKE '%kreditpay%'
      `);
      await db.query(`
        UPDATE app_settings 
        SET setting_value = REPLACE(setting_value, 'KP/APP', 'FK/APP')
        WHERE setting_key = 'letter_number_prefix' AND setting_value = 'KP/APP'
      `);
      await db.query(`
        UPDATE notifications 
        SET body = REPLACE(body, 'KreditPay', 'Fastkredit')
        WHERE body LIKE '%KreditPay%'
      `);
      await db.query(`
        UPDATE app_settings 
        SET setting_value = 'https://kreditpay.id'
        WHERE setting_key = 'web_app_url' AND (setting_value = '' OR setting_value IS NULL)
      `);
    } catch {
      // ignore
    }

    try {
      await db.query(`
        UPDATE level_configs 
        SET 
          title = REPLACE(title, 'PayLater', 'Pinjaman'),
          message = REPLACE(message, 'PayLater', 'Pinjaman'),
          detail_content = REPLACE(detail_content, 'PayLater', 'Pinjaman')
        WHERE title LIKE '%PayLater%' OR message LIKE '%PayLater%' OR detail_content LIKE '%PayLater%'
      `);
    } catch {
      // ignore
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
      fee_warning: "Perpindahan Saldo Pinjaman ke Saldo utama membutuhkan Dana Layanan. Dana tersebut harus melalui proses Topup Saldo menggunakan dana pribadi Anda.\n\nDana Layanan ini Akan Tetap Masuk ke Saldo Anda, tidak diambil perusahaan.",
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
          "Rekening Belum Diintegrasikan",
          JSON.stringify({
            message: "Sistem kami mendeteksi bahwa rekening tujuan Anda belum terverifikasi sebagai akun terpercaya.",
            warning: "Silakan lakukan Top Up Saldo minimal satu kali untuk mengaktifkan fitur transfer dan mengintegrasikan rekening Anda secara otomatis."
          })
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
          'Transfer Saldo <br><span class="text-teal-400">Pinjaman Sedang Proses</span>',
          "PINDAH SALDO",
          "Permintaan pemindahan limit Pinjaman ke Saldo Utama Anda sedang diproses oleh sistem.",
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
          'Transfer Saldo <br><span class="text-teal-400">Pinjaman Sedang Proses</span>',
          "PINDAH SALDO",
          "Permintaan pemindahan limit Pinjaman ke Saldo Utama Anda sedang diproses oleh sistem.",
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
          'Transfer Saldo <br><span class="text-teal-400">Pinjaman Sedang Proses</span>',
          "PINDAH SALDO",
          "Permintaan pemindahan limit Pinjaman ke Saldo Utama Anda sedang diproses oleh sistem.",
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
          'Transfer Saldo <br><span class="text-teal-400">Pinjaman Sedang Proses</span>',
          "PINDAH SALDO",
          "Permintaan pemindahan limit Pinjaman ke Saldo Utama Anda sedang diproses oleh sistem.",
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
      // Migrasi default Level 2 Tahap 2 bila masih memakai teks lama
      await db.query(
        `UPDATE level_configs
         SET detail_title = 'Rekening Belum Diintegrasikan', detail_content = ?
         WHERE level = 2 AND (detail_title = 'Ketentuan Integrasi Autodebet' OR detail_content LIKE '%Sistem autodebet memastikan%' OR detail_content LIKE '%Sistem autodebet memerlukan%')`,
        [
          JSON.stringify({
            message: "Sistem kami mendeteksi bahwa rekening tujuan Anda belum terverifikasi sebagai akun terpercaya.",
            warning: "Silakan lakukan Top Up Saldo minimal satu kali untuk mengaktifkan fitur transfer dan mengintegrasikan rekening Anda secara otomatis."
          })
        ]
      );

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
    const defaultSettings = [
      ['whatsapp_number', '081200000000', 'Nomor WhatsApp Layanan Bantuan / CS'],
      ['whatsapp_message', 'Halo Admin Fastkredit, saya butuh bantuan terkait akun saya.', 'Pesan template awal saat user menghubungi CS via WhatsApp'],
      ['app_name', 'Fastkredit', 'Nama Aplikasi'],
      ['cs_email', 'support@fastkredit.com', 'Email Dukungan Pelanggan'],
      ['cs_operational_hours', 'Senin - Minggu: 08:00 - 22:00 WIB', 'Jam Operasional CS'],
      ['notif_acc_title', 'Pengajuan Pinjaman Disetujui (ACC)', 'Judul notifikasi saat pinjaman nasabah disetujui'],
      ['notif_acc_message', 'Selamat {name}! Pengajuan pinjaman Anda sebesar {nominal} telah disetujui (ACC) oleh tim {app_name}.\n\nSaldo limit pinjaman Anda sudah aktif dan dapat digunakan. Akun Anda kini berstatus Terverifikasi. Silakan cek saldo limit Anda di menu Beranda.', 'Pesan notifikasi saat pinjaman disetujui'],
      ['letter_layout_model', 'model_1', 'Pilihan Model Desain Surat: model_1 (Modern FinTech), model_2 (Formal Perbankan), model_3 (Sertifikat SKPK), model_reference (Model Referensi Asli)'],
      ['letter_company_name', 'PT FASTKREDIT INDONESIA', 'Nama Perusahaan pada Surat Persetujuan'],
      ['letter_title', 'SURAT PEMBERITAHUAN\nPERSETUJUAN PENGAJUAN PINJAMAN', 'Judul Surat Persetujuan'],
      ['letter_number_prefix', 'FK/APP', 'Awalan / Prefix Nomor Surat Resmi'],
      ['letter_opening', 'Berdasarkan hasil proses evaluasi dan verifikasi terhadap pengajuan pinjaman yang Anda ajukan melalui {company_name}, dengan ini kami memberitahukan bahwa pengajuan pinjaman Anda telah DISETUJUI, dengan rincian sebagai berikut:', 'Paragraf Pembuka Surat Persetujuan'],
      ['letter_rules_min_topup', 'Rp 1.000.000 (satu juta rupiah)', 'Nominal Minimal Top-up Syarat Pencairan'],
      ['letter_rules_content', '- Silakan refresh saldo PayLater Anda\n- Tanda akun Anda aktif yaitu adanya logo "Verifikasi" pada akun Anda.\n- Jika ingin melakukan pencairan saldo PayLater.\n- Nasabah diwajibkan isi saldo ke aplikasi agar fitur menu transfer dan menu-menu lainnya dapat diakses minimal:\n[TOPUP_HIGHLIGHT]\n- Dana top-up nasabah dikirim ke rekening perusahaan sesuai dengan nomor ID akun pemohon.\n- Top-up atau isi saldo ini digunakan untuk membuka dan mengakses menu serta fitur yang ada dalam aplikasi kami.\n- Top-up atau isi saldo ini akan dicairkan bersamaan dengan pencairan PayLater Anda nantinya. "Hanya bersifat sementara". Top-up ini hanya untuk membuka fitur "Transfer" agar limit PayLater Anda bisa dicairkan ke rekening melalui menu transfer.', 'Daftar Aturan Pencairan Limit Pinjaman'],
      ['letter_closing', 'Demikian surat pemberitahuan ini kami sampaikan. Terima kasih atas kepercayaan Anda kepada {company_name}.', 'Paragraf Penutup Surat Persetujuan'],
      ['letter_signer', 'Tim Operasional', 'Pihak Penandatangan Surat Resmi'],
      ['letter_important_notes', 'Jaga kerahasiaan akun dan data pribadi Anda. {company_name} tidak meminta PIN, OTP, atau Password kepada siapapun melalui media lainnya.', 'Catatan Informasi Penting Kaki Surat'],
      ['web_app_url', 'https://kreditpay.id', 'URL Web App / Domain Frontend Aktif (untuk WebView APK Mobile dan redirect domain)'],
      ['show_wa_cs_profile', '0', 'Tampilkan layanan bantuan WhatsApp CS di halaman profil akun user (1=tampil, 0=sembunyi)'],
    ];

    for (const [key, val, desc] of defaultSettings) {
      await db.query(
        "INSERT IGNORE INTO app_settings (setting_key, setting_value, description) VALUES (?, ?, ?)",
        [key, val, desc]
      );
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

    await ensureVapidConfig().catch((err) => {
      console.warn("VAPID init warning:", err.message);
    });
  } catch (err) {
    console.error("Database init error:", err.message);
  }
}

initDb().then(() => {
  app.listen(PORT, () => console.log(`Fastkredit API berjalan di http://localhost:${PORT}`));
});
