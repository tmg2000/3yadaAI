import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getDb, generateId } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "3yada-ai-secret-key-change-in-production";
const SALT_ROUNDS = 10;

export type UserRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  age: number | null;
  health_insurance: string | null;
  created_at: string;
};

export type SafeUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  age: number | null;
  health_insurance: string | null;
  created_at: string;
};

export type JwtPayload = {
  userId: string;
  email: string;
};

export function toSafeUser(row: UserRow): SafeUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? null,
    date_of_birth: row.date_of_birth,
    gender: row.gender,
    age: row.age ?? null,
    health_insurance: row.health_insurance ?? null,
    created_at: row.created_at,
  };
}

export async function registerUser(name: string, email: string, password: string): Promise<SafeUser> {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) throw new Error("البريد الإلكتروني مستخدم بالفعل");

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const id = generateId();
  db.prepare("INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)").run(id, name, email, password_hash);
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow;
  return toSafeUser(row);
}

export async function loginUser(email: string, password: string): Promise<{ user: SafeUser; token: string }> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow | undefined;
  if (!row) throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");

  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");

  const token = jwt.sign({ userId: row.id, email: row.email } satisfies JwtPayload, JWT_SECRET, { expiresIn: "7d" });
  return { user: toSafeUser(row), token };
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "تسجيل الدخول مطلوب" });
    return;
  }
  try {
    const payload = verifyToken(header.slice(7));
    const db = getDb();
    const row = db.prepare("SELECT * FROM users WHERE id = ?").get(payload.userId) as UserRow | undefined;
    if (!row) {
      res.status(401).json({ error: "المستخدم غير موجود" });
      return;
    }
    req.user = toSafeUser(row);
    next();
  } catch {
    res.status(401).json({ error: "انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً" });
  }
}
