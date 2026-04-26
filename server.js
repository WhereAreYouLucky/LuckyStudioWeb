const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = 3000;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, "data", "site.json");
const AUTH_FILE = path.join(ROOT, "data", "auth.json");
const UPLOADS_DIR = path.join(ROOT, "uploads");

// ─── Auth helpers ───
const sessions = new Map();
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 saat

function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, storedHash) {
  const computed = crypto.scryptSync(password, salt, 64).toString("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(storedHash, "hex"));
  } catch {
    return false;
  }
}

function createSession(username) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { username, createdAt: Date.now() });
  // Eski session'ları temizle
  for (const [k, v] of sessions) {
    if (Date.now() - v.createdAt > SESSION_TTL) sessions.delete(k);
  }
  return token;
}

function getSession(req) {
  const auth = req.headers["authorization"] || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() - session.createdAt > SESSION_TTL) {
    sessions.delete(token);
    return null;
  }
  return session;
}

function requireAuth(req, res) {
  if (!getSession(req)) {
    json(res, 401, { error: "Yetkisiz erişim" });
    return false;
  }
  return true;
}

// ─── Auth initialization ───
function initAuth() {
  const dir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(AUTH_FILE)) {
    const defaultPass = "things2024";
    const { salt, hash } = hashPassword(defaultPass);
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ username: "admin", salt, hash }, null, 2));
    console.log("───────────────────────────────────────");
    console.log("  Varsayılan admin hesabı oluşturuldu:");
    console.log("  Kullanıcı: admin");
    console.log("  Şifre:     things2024");
    console.log("  İlk girişte şifrenizi değiştirin!");
    console.log("───────────────────────────────────────");
  }
}
initAuth();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".jsx": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-cache",
  });
  res.end(body);
}

function parseMultipart(buf, boundary) {
  const parts = [];
  const sep = Buffer.from("--" + boundary);
  let start = 0;

  while (true) {
    const idx = buf.indexOf(sep, start);
    if (idx === -1) break;
    if (start > 0) {
      // strip leading \r\n after boundary
      let partStart = start;
      let partEnd = idx - 2; // remove trailing \r\n before next boundary
      if (partEnd > partStart) {
        const partBuf = buf.slice(partStart, partEnd);
        const headerEnd = partBuf.indexOf("\r\n\r\n");
        if (headerEnd !== -1) {
          const headers = partBuf.slice(0, headerEnd).toString();
          const body = partBuf.slice(headerEnd + 4);
          const nameMatch = headers.match(/name="([^"]+)"/);
          const fileMatch = headers.match(/filename="([^"]+)"/);
          const typeMatch = headers.match(/Content-Type:\s*(.+)/i);
          parts.push({
            name: nameMatch ? nameMatch[1] : "",
            filename: fileMatch ? fileMatch[1] : null,
            contentType: typeMatch ? typeMatch[1].trim() : null,
            data: body,
          });
        }
      }
    }
    start = idx + sep.length + 2; // skip boundary + \r\n
    // check for closing --
    if (buf[idx + sep.length] === 0x2d && buf[idx + sep.length + 1] === 0x2d) break;
  }
  return parts;
}

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    res.end();
    return;
  }

  const url = decodeURIComponent(req.url.split("?")[0]);

  // ─── API: Login ───
  if (url === "/api/login" && req.method === "POST") {
    try {
      const body = await readBody(req);
      const { username, password } = JSON.parse(body.toString());
      if (!username || !password) {
        json(res, 400, { error: "Kullanıcı adı ve şifre gerekli" });
        return;
      }
      const auth = JSON.parse(fs.readFileSync(AUTH_FILE, "utf-8"));
      if (username !== auth.username || !verifyPassword(password, auth.salt, auth.hash)) {
        // Brute-force koruması: kısa gecikme
        await new Promise((r) => setTimeout(r, 500));
        json(res, 401, { error: "Kullanıcı adı veya şifre hatalı" });
        return;
      }
      const token = createSession(username);
      json(res, 200, { token, username });
    } catch (e) {
      json(res, 500, { error: "Giriş hatası: " + e.message });
    }
    return;
  }

  // ─── API: Check auth ───
  if (url === "/api/check-auth" && req.method === "GET") {
    const session = getSession(req);
    if (session) json(res, 200, { ok: true, username: session.username });
    else json(res, 401, { error: "Oturum geçersiz" });
    return;
  }

  // ─── API: Logout ───
  if (url === "/api/logout" && req.method === "POST") {
    const auth = req.headers["authorization"] || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (token) sessions.delete(token);
    json(res, 200, { ok: true });
    return;
  }

  // ─── API: Change password ───
  if (url === "/api/change-password" && req.method === "POST") {
    if (!requireAuth(req, res)) return;
    try {
      const body = await readBody(req);
      const { oldPassword, newPassword } = JSON.parse(body.toString());
      if (!oldPassword || !newPassword) {
        json(res, 400, { error: "Eski ve yeni şifre gerekli" });
        return;
      }
      if (newPassword.length < 6) {
        json(res, 400, { error: "Yeni şifre en az 6 karakter olmalı" });
        return;
      }
      const auth = JSON.parse(fs.readFileSync(AUTH_FILE, "utf-8"));
      if (!verifyPassword(oldPassword, auth.salt, auth.hash)) {
        json(res, 401, { error: "Mevcut şifre hatalı" });
        return;
      }
      const { salt, hash } = hashPassword(newPassword);
      auth.salt = salt;
      auth.hash = hash;
      fs.writeFileSync(AUTH_FILE, JSON.stringify(auth, null, 2));
      // Mevcut oturumları temizle (yeniden giriş zorunlu)
      sessions.clear();
      const token = createSession(auth.username);
      json(res, 200, { ok: true, token });
    } catch (e) {
      json(res, 500, { error: "Şifre değiştirme hatası: " + e.message });
    }
    return;
  }

  // ─── API: Get site data ───
  if (url === "/api/data" && req.method === "GET") {
    // Public read - site front-end'i de kullanıyor
    try {
      const data = fs.readFileSync(DATA_FILE, "utf-8");
      json(res, 200, JSON.parse(data));
    } catch {
      json(res, 500, { error: "Veri okunamadı" });
    }
    return;
  }

  // ─── API: Save site data ─── (AUTH REQUIRED)
  if (url === "/api/data" && req.method === "POST") {
    if (!requireAuth(req, res)) return;
    try {
      const body = await readBody(req);
      const data = JSON.parse(body.toString());
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
      json(res, 200, { ok: true });
    } catch (e) {
      json(res, 400, { error: "Geçersiz veri: " + e.message });
    }
    return;
  }

  // ─── API: Upload image ─── (AUTH REQUIRED)
  if (url === "/api/upload" && req.method === "POST") {
    if (!requireAuth(req, res)) return;
    try {
      const contentType = req.headers["content-type"] || "";
      const boundaryMatch = contentType.match(/boundary=(.+)/);
      if (!boundaryMatch) {
        json(res, 400, { error: "Multipart boundary bulunamadı" });
        return;
      }
      const buf = await readBody(req);
      const parts = parseMultipart(buf, boundaryMatch[1]);
      const filePart = parts.find((p) => p.filename);
      if (!filePart) {
        json(res, 400, { error: "Dosya bulunamadı" });
        return;
      }
      const ext = path.extname(filePart.filename).toLowerCase() || ".jpg";
      const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
      if (!allowed.includes(ext)) {
        json(res, 400, { error: "Desteklenmeyen dosya türü" });
        return;
      }
      const name = crypto.randomBytes(8).toString("hex") + ext;
      const dest = path.join(UPLOADS_DIR, name);
      fs.writeFileSync(dest, filePart.data);
      json(res, 200, { url: "/uploads/" + name, filename: name });
    } catch (e) {
      json(res, 500, { error: "Yükleme hatası: " + e.message });
    }
    return;
  }

  // ─── API: Delete image ─── (AUTH REQUIRED)
  if (url.startsWith("/api/delete-image") && req.method === "POST") {
    if (!requireAuth(req, res)) return;
    try {
      const body = await readBody(req);
      const { filename } = JSON.parse(body.toString());
      if (!filename || filename.includes("..") || filename.includes("/")) {
        json(res, 400, { error: "Geçersiz dosya adı" });
        return;
      }
      const filePath = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      json(res, 200, { ok: true });
    } catch (e) {
      json(res, 500, { error: e.message });
    }
    return;
  }

  // ─── Static files ───
  let filePath = url === "/" ? "/Things.html" : url;
  const absPath = path.join(ROOT, filePath);

  if (!absPath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(absPath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
      return;
    }
    const ext = path.extname(absPath).toLowerCase();
    const mime = MIME[ext] || "application/octet-stream";
    const isImage = [".png",".jpg",".jpeg",".gif",".webp",".svg",".ico"].includes(ext);
    const isFont = [".woff",".woff2"].includes(ext);
    const cacheControl = (isImage || isFont) ? "public, max-age=604800" : "no-cache";
    res.writeHead(200, {
      "Content-Type": mime,
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Admin:  http://localhost:${PORT}/admin.html`);
});
