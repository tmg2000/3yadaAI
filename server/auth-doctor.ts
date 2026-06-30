import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { getDb, generateId } from "./db.js";
import { generateDefaultSlots, resolveBookableSlots } from "./slots.js";

const JWT_SECRET = process.env.JWT_SECRET || randomBytes(32).toString("hex");
const SALT_ROUNDS = 10;

export type DoctorRow = {
  id: string;
  name: string;
  specialty: string;
  specialty_key: string;
  hospital: string;
  city: string | null;
  area: string | null;
  license_number: string | null;
  rating: number;
  experience_years: number;
  consultation_fee: number;
  available_slots: string;
  image: string;
  email: string | null;
  password_hash: string | null;
  phone: string | null;
  bio: string | null;
  id_card_path: string | null;
  license_doc_path: string | null;
  is_verified: number;
  google_map_link: string | null;
  accepted_insurances: string | null;
};

export type SafeDoctor = {
  id: string;
  name: string;
  specialty: string;
  specialtyKey: string;
  hospital: string;
  city: string | null;
  area: string | null;
  licenseNumber: string | null;
  rating: number;
  experienceYears: number;
  consultationFee: number;
  availableSlots: string[];
  image: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  idCardPath: string | null;
  licenseDocPath: string | null;
  isVerified: boolean;
  googleMapLink: string | null;
  acceptedInsurances: string[];
};

export function toSafeDoctor(row: DoctorRow): SafeDoctor {
  return {
    id: row.id, name: row.name, specialty: row.specialty,
    specialtyKey: row.specialty_key, hospital: row.hospital, city: row.city,
    area: row.area, licenseNumber: row.license_number,
    rating: row.rating, experienceYears: row.experience_years,
    consultationFee: row.consultation_fee,
    availableSlots: resolveBookableSlots(JSON.parse(row.available_slots || "[]") as string[]),
    image: row.image, email: row.email, phone: row.phone, bio: row.bio,
    idCardPath: row.id_card_path, licenseDocPath: row.license_doc_path,
    isVerified: row.is_verified === 1,
    googleMapLink: row.google_map_link,
    acceptedInsurances: JSON.parse(row.accepted_insurances || "[]"),
  };
}

export async function registerDoctor(data: {
  id: string; name: string; email: string; password: string;
  phone?: string; bio?: string;
}): Promise<SafeDoctor> {
  const db = await getDb();
  const existing = await db.prepare("SELECT id FROM doctors WHERE email = ?").get(data.email);
  if (existing) throw new Error("البريد الإلكتروني مستخدم بالفعل");

  const hash = await bcrypt.hash(data.password, SALT_ROUNDS);
  await db.prepare("UPDATE doctors SET email = ?, password_hash = ?, phone = ?, bio = ? WHERE id = ?").run(
    data.email, hash, data.phone ?? null, data.bio ?? null, data.id
  );
  const row = await db.prepare("SELECT * FROM doctors WHERE id = ?").get(data.id) as DoctorRow;
  return toSafeDoctor(row);
}

export async function createDoctor(data: {
  name: string; email: string; password: string; specialty: string; specialtyKey: string;
  hospital: string; city?: string; area?: string; licenseNumber?: string; phone?: string; bio?: string;
  idCardPath?: string; licenseDocPath?: string;
}): Promise<{ doctor: SafeDoctor; token: string }> {
  const db = await getDb();
  const existing = await db.prepare("SELECT id FROM doctors WHERE email = ?").get(data.email);
  if (existing) throw new Error("البريد الإلكتروني مستخدم بالفعل");

  const hash = await bcrypt.hash(data.password, SALT_ROUNDS);
  const id = generateId();
  
  const defaultSlots = JSON.stringify(generateDefaultSlots());
  const defaultInsurances = JSON.stringify(["بوبا", "التعاونية", "ميدغلف", "أكسا"]);

  await db.prepare(`INSERT INTO doctors (id, name, specialty, specialty_key, hospital, city, area, license_number, email, password_hash, phone, bio, id_card_path, license_doc_path, is_verified, available_slots, rating, experience_years, consultation_fee, image, accepted_insurances)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 4.8, 5, 250, '👨‍⚕️', ?)`).run(
    id, data.name, data.specialty, data.specialtyKey, data.hospital, data.city ?? null,
    data.area ?? null, data.licenseNumber ?? null,
    data.email, hash, data.phone ?? null, data.bio ?? null,
    data.idCardPath ?? null, data.licenseDocPath ?? null,
    defaultSlots, defaultInsurances
  );

  // Assign 3-day Premium trial subscription for new doctors
  const subId = generateId();
  await db.prepare(`
    INSERT INTO doctor_subscriptions (id, doctor_id, plan_id, start_date, end_date, is_trial)
    VALUES (?, ?, 'plan_premium', datetime('now'), datetime('now', '+3 days'), 1)
  `).run(subId, id);

  const row = await db.prepare("SELECT * FROM doctors WHERE id = ?").get(id) as DoctorRow;
  const doctor = toSafeDoctor(row);
  const token = jwt.sign({ doctorId: id, email: data.email }, JWT_SECRET, { expiresIn: "7d" });
  return { doctor, token };
}

export async function loginDoctor(email: string, password: string): Promise<{ doctor: SafeDoctor; token: string }> {
  const db = await getDb();
  const row = await db.prepare("SELECT * FROM doctors WHERE email = ?").get(email) as DoctorRow | undefined;
  if (!row || !row.password_hash) throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");

  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");

  const token = jwt.sign({ doctorId: row.id, email: row.email }, JWT_SECRET, { expiresIn: "7d" });
  return { doctor: toSafeDoctor(row), token };
}

export function verifyDoctorToken(token: string): { doctorId: string; email: string } {
  return jwt.verify(token, JWT_SECRET) as { doctorId: string; email: string };
}

declare global {
  namespace Express {
    interface Request {
      doctor?: SafeDoctor;
    }
  }
}

export async function doctorAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "تسجيل الدخول مطلوب" });
    return;
  }
  try {
    const payload = verifyDoctorToken(header.slice(7));
    const db = await getDb();
    const row = await db.prepare("SELECT * FROM doctors WHERE id = ?").get(payload.doctorId) as DoctorRow | undefined;
    if (!row) {
      res.status(401).json({ error: "الطبيب غير موجود" });
      return;
    }
    req.doctor = toSafeDoctor(row);
    next();
  } catch {
    res.status(401).json({ error: "انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً" });
  }
}
