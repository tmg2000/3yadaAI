import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { getDb, generateId } from "./db.js";

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || randomBytes(32).toString("hex");
const SALT_ROUNDS = 10;

export type AdminRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: string;
};

export function seedAdmin() {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM admins WHERE email = ?").get("admin@3yada.ai");
  if (existing) return;

  const hash = bcrypt.hashSync("admin123", SALT_ROUNDS);
  db.prepare("INSERT INTO admins (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)").run(
    generateId(), "المشرف العام", "admin@3yada.ai", hash, "super_admin"
  );
}

export function loginAdmin(email: string, password: string): { admin: { id: string; name: string; email: string; role: string }; token: string } {
  const db = getDb();
  const row = db.prepare("SELECT * FROM admins WHERE email = ?").get(email) as AdminRow | undefined;
  if (!row) throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");

  const valid = bcrypt.compareSync(password, row.password_hash);
  if (!valid) throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");

  const token = jwt.sign({ adminId: row.id, email: row.email }, ADMIN_JWT_SECRET, { expiresIn: "24h" });
  return { admin: { id: row.id, name: row.name, email: row.email, role: row.role }, token };
}

export function verifyAdminToken(token: string): { adminId: string; email: string } {
  return jwt.verify(token, ADMIN_JWT_SECRET) as { adminId: string; email: string };
}

export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "تسجيل الدخول مطلوب" });
    return;
  }
  try {
    const payload = verifyAdminToken(header.slice(7));
    const db = getDb();
    const row = db.prepare("SELECT id, name, email, role FROM admins WHERE id = ?").get(payload.adminId) as AdminRow | undefined;
    if (!row) {
      res.status(401).json({ error: "المشرف غير موجود" });
      return;
    }
    (req as any).admin = { id: row.id, name: row.name, email: row.email, role: row.role };
    next();
  } catch {
    res.status(401).json({ error: "انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً" });
  }
}
