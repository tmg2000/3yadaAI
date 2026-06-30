import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync, mkdirSync, unlinkSync } from "fs";
import { generateDefaultSlots } from "./slots.js";
import { normalizeSpecialtyKeys } from "./specialties.js";
import { defaultDoctors, type DoctorSeed } from "./data/doctors-data.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "data");
const DB_PATH = join(DATA_DIR, "app.db");
const TURSO_URL = process.env.TURSO_DATABASE_URL || "";
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || "";

type DbClient = {
  prepare: (sql: string) => {
    run: (...params: any[]) => Promise<{ changes?: number; lastInsertRowid?: number | bigint }>;
    get: (...params: any[]) => Promise<any>;
    all: (...params: any[]) => Promise<any[]>;
  };
  exec: (sql: string) => Promise<void>;
  transaction: (fn: () => Promise<void>) => Promise<void>;
  close: () => Promise<void>;
  _raw: any;
};

let dbClient: DbClient | null = null;

async function createBetterSqlite3(): Promise<DbClient> {
  const Database = (await import("better-sqlite3")).default;
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  const native = new Database(DB_PATH);
  native.pragma("journal_mode = WAL");
  native.pragma("foreign_keys = ON");

  function prepare(sql: string) {
    const stmt = native.prepare(sql);
    return {
      run: (...params: any[]) => Promise.resolve(stmt.run(...params)),
      get: (...params: any[]) => Promise.resolve(stmt.get(...params) ?? null),
      all: (...params: any[]) => Promise.resolve(stmt.all(...params)),
    };
  }

  return {
    prepare,
    exec: (sql: string): Promise<void> => { native.exec(sql); return Promise.resolve(); },
    transaction: async (fn: () => Promise<void>): Promise<void> => {
      const tx = native.transaction(fn);
      await tx();
    },
    close: (): Promise<void> => { native.close(); return Promise.resolve(); },
    _raw: native,
  };
}

async function createTursoClient(): Promise<DbClient> {
  const { createClient } = await import("@libsql/client");
  const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN || undefined });

  function prepare(sql: string) {
    return {
      run: async (...params: any[]) => {
        const result = await client.execute({ sql, args: params });
        return { changes: result.rowsAffected, lastInsertRowid: result.lastInsertRowid };
      },
      get: async (...params: any[]) => {
        const result = await client.execute({ sql, args: params });
        return result.rows[0] ?? null;
      },
      all: async (...params: any[]) => {
        const result = await client.execute({ sql, args: params });
        return result.rows;
      },
    };
  }

  return {
    prepare,
    exec: async (sql: string) => { await client.execute(sql); },
    transaction: async (fn: () => Promise<void>) => {
      const tx = await client.transaction("write");
      const txClient: DbClient = {
        prepare: (sql: string) => {
          return {
            run: async (...params: any[]) => {
              const result = await tx.execute({ sql, args: params });
              return { changes: result.rowsAffected, lastInsertRowid: result.lastInsertRowid };
            },
            get: async (...params: any[]) => {
              const result = await tx.execute({ sql, args: params });
              return result.rows[0] ?? null;
            },
            all: async (...params: any[]) => {
              const result = await tx.execute({ sql, args: params });
              return result.rows;
            },
          };
        },
        exec: async (s: string) => { await tx.execute(s); },
        transaction: async (f: () => Promise<void>) => { await f(); },
        close: async () => {},
        _raw: tx,
      };
      const oldDb = dbClient;
      dbClient = txClient;
      try { await fn(); await tx.commit(); } catch (e) { await tx.rollback(); throw e; } finally { dbClient = oldDb; }
    },
    close: async () => { client.close(); },
    _raw: client,
  };
}

export async function initDb(): Promise<void> {
  const usingTurso = !!TURSO_URL;
  dbClient = usingTurso ? await createTursoClient() : await createBetterSqlite3();
  const db = dbClient!;
  if (usingTurso) {
    await initSchemaTurso(db);
    await seedTursoSubscriptionPlans(db);
    await seedTursoDoctors(db);
  } else {
    const native = db._raw as any;
    initSchema(native);
    seedDoctors(native);
    runMigrations(native);
  }
}

export async function getDb(): Promise<DbClient> {
  if (!dbClient) await initDb();
  return dbClient!;
}

function initSchema(native: any) {
  native.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      date_of_birth TEXT,
      gender TEXT,
      phone TEXT,
      age INTEGER,
      health_insurance TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'استشارة جديدة',
      summary_json TEXT,
      status TEXT NOT NULL DEFAULT 'in_progress',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_id TEXT,
      title TEXT NOT NULL DEFAULT 'استشارة جديدة',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      attachments TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_id TEXT,
      doctor_id TEXT NOT NULL,
      doctor_name TEXT NOT NULL,
      specialty TEXT NOT NULL,
      hospital TEXT NOT NULL,
      city TEXT,
      slot TEXT NOT NULL,
      patient_name TEXT NOT NULL,
      phone TEXT,
      fee REAL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS doctors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      specialty TEXT NOT NULL,
      specialty_key TEXT NOT NULL,
      hospital TEXT NOT NULL,
      city TEXT,
      area TEXT,
      license_number TEXT,
      rating REAL NOT NULL DEFAULT 0,
      experience_years INTEGER NOT NULL DEFAULT 0,
      consultation_fee REAL NOT NULL DEFAULT 0,
      available_slots TEXT NOT NULL DEFAULT '[]',
      image TEXT NOT NULL DEFAULT '👨‍⚕️',
      email TEXT UNIQUE,
      password_hash TEXT,
      phone TEXT,
      bio TEXT,
      id_card_path TEXT,
      license_doc_path TEXT,
      is_verified INTEGER DEFAULT 0,
      google_map_link TEXT,
      accepted_insurances TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS subscription_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price_monthly REAL NOT NULL,
      price_yearly REAL NOT NULL,
      max_patients INTEGER,
      features TEXT NOT NULL DEFAULT '[]',
      active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS doctor_subscriptions (
      id TEXT PRIMARY KEY,
      doctor_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      start_date TEXT NOT NULL DEFAULT (datetime('now')),
      end_date TEXT NOT NULL,
      auto_renew INTEGER NOT NULL DEFAULT 1,
      active INTEGER NOT NULL DEFAULT 1,
      is_trial INTEGER DEFAULT 0,
      billing_period TEXT DEFAULT 'monthly',
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS medical_summaries (
      id TEXT PRIMARY KEY,
      appointment_id TEXT NOT NULL,
      doctor_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      edited_at TEXT,
      FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS doctor_clinic_patients (
      id TEXT PRIMARY KEY,
      doctor_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      age INTEGER,
      gender TEXT,
      history TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS prescriptions (
      id TEXT PRIMARY KEY,
      doctor_id TEXT NOT NULL,
      patient_id TEXT,
      patient_name TEXT NOT NULL,
      patient_phone TEXT,
      medication_name TEXT NOT NULL,
      dosage TEXT,
      frequency TEXT,
      duration TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS clinic_visits (
      id TEXT PRIMARY KEY,
      doctor_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      visit_date TEXT NOT NULL DEFAULT (datetime('now')),
      chief_complaint TEXT,
      diagnosis TEXT,
      treatment_plan TEXT,
      notes TEXT,
      follow_up_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
      FOREIGN KEY (patient_id) REFERENCES doctor_clinic_patients(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS patient_files (
      id TEXT PRIMARY KEY,
      doctor_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      file_type TEXT NOT NULL CHECK(file_type IN ('prescription', 'xray', 'lab', 'report', 'other')),
      title TEXT NOT NULL,
      notes TEXT,
      file_path TEXT,
      original_name TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
      FOREIGN KEY (patient_id) REFERENCES doctor_clinic_patients(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS clinic_financial_transactions (
      id TEXT PRIMARY KEY,
      doctor_id TEXT NOT NULL,
      patient_id TEXT,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT,
      counterparty TEXT,
      status TEXT NOT NULL DEFAULT 'paid' CHECK(status IN ('paid', 'unpaid', 'partial')),
      transaction_date TEXT NOT NULL DEFAULT (datetime('now')),
      due_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
      FOREIGN KEY (patient_id) REFERENCES doctor_clinic_patients(id) ON DELETE SET NULL
    );
  `);
}

const SCHEMA_TABLES = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, date_of_birth TEXT, gender TEXT, phone TEXT, age INTEGER, health_insurance TEXT, created_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL DEFAULT 'استشارة جديدة', summary_json TEXT, status TEXT NOT NULL DEFAULT 'in_progress', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, session_id TEXT, title TEXT NOT NULL DEFAULT 'استشارة جديدة', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL)`,
  `CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('user', 'assistant')), content TEXT NOT NULL, attachments TEXT, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS appointments (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, session_id TEXT, doctor_id TEXT NOT NULL, doctor_name TEXT NOT NULL, specialty TEXT NOT NULL, hospital TEXT NOT NULL, city TEXT, slot TEXT NOT NULL, patient_name TEXT NOT NULL, phone TEXT, fee REAL, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL)`,
  `CREATE TABLE IF NOT EXISTS doctors (id TEXT PRIMARY KEY, name TEXT NOT NULL, specialty TEXT NOT NULL, specialty_key TEXT NOT NULL, hospital TEXT NOT NULL, city TEXT, area TEXT, license_number TEXT, rating REAL NOT NULL DEFAULT 0, experience_years INTEGER NOT NULL DEFAULT 0, consultation_fee REAL NOT NULL DEFAULT 0, available_slots TEXT NOT NULL DEFAULT '[]', image TEXT NOT NULL DEFAULT '👨‍⚕️', email TEXT UNIQUE, password_hash TEXT, phone TEXT, bio TEXT, id_card_path TEXT, license_doc_path TEXT, is_verified INTEGER DEFAULT 0, google_map_link TEXT, accepted_insurances TEXT DEFAULT '[]', created_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS subscription_plans (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL, price_monthly REAL NOT NULL, price_yearly REAL NOT NULL, max_patients INTEGER, features TEXT NOT NULL DEFAULT '[]', active INTEGER NOT NULL DEFAULT 1)`,
  `CREATE TABLE IF NOT EXISTS doctor_subscriptions (id TEXT PRIMARY KEY, doctor_id TEXT NOT NULL, plan_id TEXT NOT NULL, start_date TEXT NOT NULL DEFAULT (datetime('now')), end_date TEXT NOT NULL, auto_renew INTEGER NOT NULL DEFAULT 1, active INTEGER NOT NULL DEFAULT 1, is_trial INTEGER DEFAULT 0, billing_period TEXT DEFAULT 'monthly', FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE, FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS admins (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'admin', created_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS medical_summaries (id TEXT PRIMARY KEY, appointment_id TEXT NOT NULL, doctor_id TEXT NOT NULL, user_id TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')), edited_at TEXT, FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE, FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS doctor_clinic_patients (id TEXT PRIMARY KEY, doctor_id TEXT NOT NULL, name TEXT NOT NULL, phone TEXT, age INTEGER, gender TEXT, history TEXT, notes TEXT, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS prescriptions (id TEXT PRIMARY KEY, doctor_id TEXT NOT NULL, patient_id TEXT, patient_name TEXT NOT NULL, patient_phone TEXT, medication_name TEXT NOT NULL, dosage TEXT, frequency TEXT, duration TEXT, notes TEXT, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS clinic_visits (id TEXT PRIMARY KEY, doctor_id TEXT NOT NULL, patient_id TEXT NOT NULL, visit_date TEXT NOT NULL DEFAULT (datetime('now')), chief_complaint TEXT, diagnosis TEXT, treatment_plan TEXT, notes TEXT, follow_up_date TEXT, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE, FOREIGN KEY (patient_id) REFERENCES doctor_clinic_patients(id) ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS patient_files (id TEXT PRIMARY KEY, doctor_id TEXT NOT NULL, patient_id TEXT NOT NULL, file_type TEXT NOT NULL CHECK(file_type IN ('prescription', 'xray', 'lab', 'report', 'other')), title TEXT NOT NULL, notes TEXT, file_path TEXT, original_name TEXT, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE, FOREIGN KEY (patient_id) REFERENCES doctor_clinic_patients(id) ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS clinic_financial_transactions (id TEXT PRIMARY KEY, doctor_id TEXT NOT NULL, patient_id TEXT, type TEXT NOT NULL CHECK(type IN ('income', 'expense')), category TEXT NOT NULL, title TEXT NOT NULL, amount REAL NOT NULL, payment_method TEXT, counterparty TEXT, status TEXT NOT NULL DEFAULT 'paid' CHECK(status IN ('paid', 'unpaid', 'partial')), transaction_date TEXT NOT NULL DEFAULT (datetime('now')), due_date TEXT, notes TEXT, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE, FOREIGN KEY (patient_id) REFERENCES doctor_clinic_patients(id) ON DELETE SET NULL)`,
];

export async function initSchemaTurso(db: DbClient): Promise<void> {
  for (const sql of SCHEMA_TABLES) {
    await db.exec(sql);
  }
}

function runMigrations(native: any) {
  const migrations = [
    "ALTER TABLE users ADD COLUMN date_of_birth TEXT",
    "ALTER TABLE users ADD COLUMN gender TEXT",
    "ALTER TABLE users ADD COLUMN phone TEXT",
    "ALTER TABLE users ADD COLUMN age INTEGER",
    "ALTER TABLE users ADD COLUMN health_insurance TEXT",
    "ALTER TABLE appointments ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'",
    "ALTER TABLE doctors ADD COLUMN email TEXT",
    "ALTER TABLE doctors ADD COLUMN password_hash TEXT",
    "ALTER TABLE doctors ADD COLUMN phone TEXT",
    "ALTER TABLE doctors ADD COLUMN bio TEXT",
    "ALTER TABLE doctors ADD COLUMN license_number TEXT",
    "ALTER TABLE doctors ADD COLUMN area TEXT",
    "ALTER TABLE doctors ADD COLUMN id_card_path TEXT",
    "ALTER TABLE doctors ADD COLUMN license_doc_path TEXT",
    "ALTER TABLE doctors ADD COLUMN is_verified INTEGER DEFAULT 0",
    "ALTER TABLE doctors ADD COLUMN google_map_link TEXT",
    "ALTER TABLE doctors ADD COLUMN accepted_insurances TEXT DEFAULT '[]'",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_doctors_email ON doctors(email) WHERE email IS NOT NULL",
    "ALTER TABLE doctor_subscriptions ADD COLUMN is_trial INTEGER DEFAULT 0",
    "ALTER TABLE doctor_subscriptions ADD COLUMN active INTEGER DEFAULT 1",
    "ALTER TABLE doctor_subscriptions ADD COLUMN billing_period TEXT DEFAULT 'monthly'",
    "ALTER TABLE conversations ADD COLUMN session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL",
    "ALTER TABLE appointments ADD COLUMN session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL",
    "ALTER TABLE medical_summaries ADD COLUMN edited_at TEXT",
    "ALTER TABLE doctors ADD COLUMN created_at TEXT",
    "CREATE INDEX IF NOT EXISTS idx_clinic_visits_patient ON clinic_visits(doctor_id, patient_id, visit_date)",
    "CREATE INDEX IF NOT EXISTS idx_patient_files_patient ON patient_files(doctor_id, patient_id, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_clinic_finances_doctor ON clinic_financial_transactions(doctor_id, transaction_date)",
  ];
  for (const sql of migrations) {
    try { native.exec(sql); } catch {}
  }
  try {
    const updates = [
      ["general", "general", "طب عام", "طب_عام"],
      ["internal", "internal", "باطنية"],
      ["pediatrics", "pediatrics", "أطفال"],
      ["cardiology", "cardiology", "قلبية"],
      ["dermatology", "dermatology", "جلدية"],
      ["orthopedics", "orthopedics", "عظام"],
      ["gynecology", "gynecology", "نساء وولادة", "نساء_وولادة"],
      ["ent", "ent", "أنف وأذن وحنجرة", "أنف_وأذن_وحنجرة"],
      ["psychiatry", "psychiatry", "طب نفسي", "طب_نفسي"],
      ["ophthalmology", "ophthalmology", "عيون"],
      ["dentistry", "dentistry", "أسنان"],
    ];
    for (const [eng, ...aliases] of updates) {
      const placeholders = aliases.map(() => "?").join(",");
      native.prepare(`UPDATE doctors SET specialty_key = ? WHERE specialty_key IN (${placeholders})`).run(eng, ...aliases);
    }
  } catch (err) {
    console.error("Failed to migrate doctor specialty keys:", err);
  }
  seedSubscriptionPlans(native);
}

function seedDoctors(native: any) {
  const count = native.prepare("SELECT COUNT(*) as c FROM doctors").get().c;
  if (count > 0) return;
  const insert = native.prepare("INSERT INTO doctors (id, name, specialty, specialty_key, hospital, city, rating, experience_years, consultation_fee, available_slots, image, accepted_insurances) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const tx = native.transaction(() => {
    for (const d of seedDoctorList()) {
      const slots = JSON.stringify(generateDefaultSlots());
      const insurances = JSON.stringify(insuranceForDoctor(d));
      insert.run(d.id, d.name, d.specialty, d.specialtyKey, d.hospital, d.city ?? null, d.rating, d.experienceYears, d.consultationFee, slots, d.image, insurances);
    }
  });
  tx();
}

function seedDoctorList(): DoctorSeed[] {
  return defaultDoctors;
}

function insuranceForDoctor(d: DoctorSeed): string[] {
  const egyptianCities = new Set(["القاهرة", "الإسكندرية", "الجيزة", "شرم الشيخ", "الأقصر", "أسوان", "الغردقة", "بورسعيد"]);
  const egyptianInsurances = ["التأمين الصحي", "أكسا", "مصر للتأمين", "أليانز", "ميتلايف"];
  const saudiInsurances = ["بوبا", "التعاونية", "ميدغلف", "أكسا"];
  const saudiMap: Record<string, string[]> = {
    general: ["بوبا", "التعاونية"], internal: ["بوبا", "ميدغلف"], pediatrics: ["التعاونية", "أكسا"],
    cardiology: ["بوبا", "ميدغلف", "أكسا"], dermatology: ["التعاونية"], orthopedics: ["ميدغلف", "أكسا"],
    gynecology: ["بوبا", "التعاونية"], ent: ["التعاونية", "أكسا"], psychiatry: ["بوبا"],
    ophthalmology: ["ميدغلف", "أكسا"], dentistry: ["بوبا", "التعاونية", "ميدغلف"],
  };
  const egyptMap: Record<string, string[]> = {
    general: ["التأمين الصحي", "أكسا"], internal: ["مصر للتأمين", "أكسا"], pediatrics: ["التأمين الصحي", "أليانز"],
    cardiology: ["مصر للتأمين", "أكسا", "ميتلايف"], dermatology: ["أليانز", "أكسا"], orthopedics: ["مصر للتأمين", "ميتلايف"],
    gynecology: ["التأمين الصحي", "أليانز"], ent: ["أكسا", "مصر للتأمين"], psychiatry: ["ميتلايف"],
    ophthalmology: ["أليانز", "أكسا"], dentistry: ["التأمين الصحي", "مصر للتأمين"],
  };
  const isEgypt = egyptianCities.has(d.city ?? "");
  const map = isEgypt ? egyptMap : saudiMap;
  const defaults = isEgypt ? egyptianInsurances : saudiInsurances;
  const normalizedKey = normalizeSpecialtyKeys([d.specialtyKey])[0] || d.specialtyKey;
  return map[normalizedKey] || defaults;
}

function seedSubscriptionPlans(native: any) {
  const count = native.prepare("SELECT COUNT(*) as c FROM subscription_plans").get().c;
  if (count > 0) return;
  const plans = [
    { id: "plan_free", name: "مجاني", description: "باقة مجانية للبدء", price_monthly: 0, price_yearly: 0, max_patients: 10, features: JSON.stringify(["لوحة تحكم بسيطة", "متابعة 10 مرضى"]) },
    { id: "plan_basic", name: "أساسي", description: "باقة احترافية للممارسين", price_monthly: 99, price_yearly: 999, max_patients: 50, features: JSON.stringify(["لوحة تحكم كاملة", "إدارة المواعيد", "تقارير إحصائية", "متابعة 50 مريض"]) },
    { id: "plan_premium", name: "مميز", description: "باقة متكاملة للمستشفيات والعيادات", price_monthly: 199, price_yearly: 1999, max_patients: null, features: JSON.stringify(["كل مزايا الأساسي", "عدد غير محدود من المرضى", "تقارير متقدمة", "استلام الملخصات الطبية", "دعم فني 24/7"]) },
  ];
  const insert = native.prepare("INSERT INTO subscription_plans (id, name, description, price_monthly, price_yearly, max_patients, features) VALUES (?, ?, ?, ?, ?, ?, ?)");
  const tx = native.transaction(() => { for (const p of plans) insert.run(p.id, p.name, p.description, p.price_monthly, p.price_yearly, p.max_patients, p.features); });
  tx();
}

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function resetDb() {
  if (TURSO_URL) {
    const db = await getDb();
    await db.exec("DROP TABLE IF EXISTS clinic_financial_transactions");
    await db.exec("DROP TABLE IF EXISTS patient_files");
    await db.exec("DROP TABLE IF EXISTS clinic_visits");
    await db.exec("DROP TABLE IF EXISTS prescriptions");
    await db.exec("DROP TABLE IF EXISTS doctor_clinic_patients");
    await db.exec("DROP TABLE IF EXISTS medical_summaries");
    await db.exec("DROP TABLE IF EXISTS doctor_subscriptions");
    await db.exec("DROP TABLE IF EXISTS subscription_plans");
    await db.exec("DROP TABLE IF EXISTS admins");
    await db.exec("DROP TABLE IF EXISTS doctors");
    await db.exec("DROP TABLE IF EXISTS appointments");
    await db.exec("DROP TABLE IF EXISTS messages");
    await db.exec("DROP TABLE IF EXISTS conversations");
    await db.exec("DROP TABLE IF EXISTS sessions");
    await db.exec("DROP TABLE IF EXISTS users");
    dbClient = null;
    await initDb();
    return;
  }
  if (dbClient) {
    const native = dbClient._raw as any;
    native.close();
    dbClient = null;
  }
  try { unlinkSync(DB_PATH); } catch {}
  try { unlinkSync(DB_PATH + "-wal"); } catch {}
  try { unlinkSync(DB_PATH + "-shm"); } catch {}
  await initDb();
}

export function isTurso(): boolean {
  return !!TURSO_URL;
}

export async function seedTursoDoctors(db: DbClient): Promise<void> {
  const count = await db.prepare("SELECT COUNT(*) as c FROM doctors").get() as any;
  if (count?.c > 0) return;
  for (const d of seedDoctorList()) {
    await db.prepare("INSERT OR IGNORE INTO doctors (id, name, specialty, specialty_key, hospital, city, rating, experience_years, consultation_fee, available_slots, image, accepted_insurances) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
      d.id, d.name, d.specialty, d.specialtyKey, d.hospital, d.city ?? null, d.rating, d.experienceYears, d.consultationFee, JSON.stringify(generateDefaultSlots()), d.image, JSON.stringify(insuranceForDoctor(d))
    );
  }
}

export async function seedTursoSubscriptionPlans(db: DbClient): Promise<void> {
  const count = await db.prepare("SELECT COUNT(*) as c FROM subscription_plans").get() as any;
  if (count?.c > 0) return;
  const plans = [
    { id: "plan_free", name: "مجاني", description: "باقة مجانية للبدء", price_monthly: 0, price_yearly: 0, max_patients: 10, features: JSON.stringify(["لوحة تحكم بسيطة", "متابعة 10 مرضى"]) },
    { id: "plan_basic", name: "أساسي", description: "باقة احترافية للممارسين", price_monthly: 99, price_yearly: 999, max_patients: 50, features: JSON.stringify(["لوحة تحكم كاملة", "إدارة المواعيد", "تقارير إحصائية", "متابعة 50 مريض"]) },
    { id: "plan_premium", name: "مميز", description: "باقة متكاملة للمستشفيات والعيادات", price_monthly: 199, price_yearly: 1999, max_patients: null, features: JSON.stringify(["كل مزايا الأساسي", "عدد غير محدود من المرضى", "تقارير متقدمة", "استلام الملخصات الطبية", "دعم فني 24/7"]) },
  ];
  for (const p of plans) {
    await db.prepare("INSERT OR IGNORE INTO subscription_plans (id, name, description, price_monthly, price_yearly, max_patients, features) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      p.id, p.name, p.description, p.price_monthly, p.price_yearly, p.max_patients, p.features
    );
  }
}
