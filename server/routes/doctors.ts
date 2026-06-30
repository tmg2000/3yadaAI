import { Router } from "express";
import { doctorAuthMiddleware, createDoctor, loginDoctor, toSafeDoctor } from "../auth-doctor.js";
import { getDb, generateId } from "../db.js";
import multer from "multer";
import { existsSync, mkdirSync } from "fs";
import { join, extname, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadsDir = join(__dirname, "..", "uploads");
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|pdf)$/i;
    if (allowed.test(extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error("فقط الصور وملفات PDF مسموح بها للمستندات"));
    }
  },
});

const router = Router();

// --- Auth ---
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email?.trim() || !password?.trim()) {
      res.status(400).json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" });
      return;
    }
    const result = await loginDoctor(email.trim().toLowerCase(), password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err instanceof Error ? err.message : "فشل تسجيل الدخول" });
  }
});

router.post("/register", upload.fields([
  { name: "idCard", maxCount: 1 },
  { name: "licenseDoc", maxCount: 1 }
]), async (req, res) => {
  try {
    const { name, email, password, specialty, specialtyKey, hospital, city, area, licenseNumber, phone, bio } = req.body as Record<string, string>;
    if (!name?.trim() || !email?.trim() || !password?.trim() || !specialty?.trim() || !specialtyKey?.trim() || !hospital?.trim()) {
      res.status(400).json({ error: "الاسم والبريد الإلكتروني وكلمة المرور والتخصص والمستشفى مطلوبون" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
      return;
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const idCardPath = files?.["idCard"]?.[0]?.filename;
    const licenseDocPath = files?.["licenseDoc"]?.[0]?.filename;

    const { doctor, token } = await createDoctor({
      name: name.trim(), email: email.trim().toLowerCase(), password,
      specialty: specialty.trim(), specialtyKey: specialtyKey.trim(),
      hospital: hospital.trim(), city: city?.trim() || undefined,
      area: area?.trim() || undefined, licenseNumber: licenseNumber?.trim() || undefined,
      phone: phone?.trim() || undefined, bio: bio?.trim() || undefined,
      idCardPath, licenseDocPath
    });
    res.json({ doctor, token });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "فشل التسجيل" });
  }
});

// --- Profile ---
router.get("/me", doctorAuthMiddleware, async (req, res) => {
  res.json({ doctor: req.doctor });
});

router.put("/me", doctorAuthMiddleware, upload.fields([
  { name: "idCard", maxCount: 1 },
  { name: "licenseDoc", maxCount: 1 }
]), async (req, res) => {
  try {
    const db = await getDb();
    const { name, phone, bio, city, area, licenseNumber, googleMapLink, acceptedInsurances } = req.body as Record<string, any>;
    if (name?.trim()) await db.prepare("UPDATE doctors SET name = ? WHERE id = ?").run(name.trim(), req.doctor!.id);
    if (phone !== undefined) await db.prepare("UPDATE doctors SET phone = ? WHERE id = ?").run(phone || null, req.doctor!.id);
    if (bio !== undefined) await db.prepare("UPDATE doctors SET bio = ? WHERE id = ?").run(bio || null, req.doctor!.id);
    if (city !== undefined) await db.prepare("UPDATE doctors SET city = ? WHERE id = ?").run(city || null, req.doctor!.id);
    if (area !== undefined) await db.prepare("UPDATE doctors SET area = ? WHERE id = ?").run(area || null, req.doctor!.id);
    if (licenseNumber !== undefined) await db.prepare("UPDATE doctors SET license_number = ? WHERE id = ?").run(licenseNumber || null, req.doctor!.id);
    if (googleMapLink !== undefined) await db.prepare("UPDATE doctors SET google_map_link = ? WHERE id = ?").run(googleMapLink || null, req.doctor!.id);
    if (acceptedInsurances !== undefined) await db.prepare("UPDATE doctors SET accepted_insurances = ? WHERE id = ?").run(JSON.stringify(acceptedInsurances || []), req.doctor!.id);
    
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (files?.["idCard"]?.[0]?.filename) {
      await db.prepare("UPDATE doctors SET id_card_path = ? WHERE id = ?").run(files["idCard"][0].filename, req.doctor!.id);
    }
    if (files?.["licenseDoc"]?.[0]?.filename) {
      await db.prepare("UPDATE doctors SET license_doc_path = ? WHERE id = ?").run(files["licenseDoc"][0].filename, req.doctor!.id);
    }
    
    const row = await db.prepare("SELECT * FROM doctors WHERE id = ?").get(req.doctor!.id) as import("../auth-doctor.js").DoctorRow;
    res.json({ doctor: toSafeDoctor(row) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "فشل تحديث البيانات" });
  }
});

// --- Appointments ---
router.get("/appointments", doctorAuthMiddleware, async (req, res) => {
  const db = await getDb();
  const { status, from, to } = req.query as { status?: string; from?: string; to?: string };
  let query = "SELECT * FROM appointments WHERE doctor_id = ?";
  const params: string[] = [req.doctor!.id];
  if (status) { query += " AND status = ?"; params.push(status); }
  if (from) { query += " AND slot >= ?"; params.push(from); }
  if (to) { query += " AND slot <= ?"; params.push(to); }
  query += " ORDER BY slot ASC";
  const rows = await db.prepare(query).all(...params);
  res.json(rows);
});

router.put("/appointments/:id/status", doctorAuthMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const { status } = req.body as { status?: string };
    const valid = ["pending", "approved", "rejected", "completed", "modification_requested"];
    if (!status || !valid.includes(status)) {
      res.status(400).json({ error: "حالة غير صالحة" });
      return;
    }
    const appt = await db.prepare("SELECT * FROM appointments WHERE id = ? AND doctor_id = ?").get(req.params.id, req.doctor!.id);
    if (!appt) {
      res.status(404).json({ error: "الموعد غير موجود" });
      return;
    }
    await db.prepare("UPDATE appointments SET status = ? WHERE id = ?").run(status, req.params.id);
    if (status === "completed") {
      const row = appt as any;
      const existing = await db.prepare(`
        SELECT id FROM clinic_financial_transactions
        WHERE doctor_id = ? AND category = 'كشف' AND title = ? AND transaction_date = ?
        LIMIT 1
      `).get(req.doctor!.id, `كشف ${row.patient_name}`, row.slot);
      if (!existing) {
        await db.prepare(`
          INSERT INTO clinic_financial_transactions
          (id, doctor_id, type, category, title, amount, payment_method, counterparty, status, transaction_date, notes)
          VALUES (?, ?, 'income', 'كشف', ?, ?, 'نقدي', ?, 'paid', ?, ?)
        `).run(
          generateId(),
          req.doctor!.id,
          `كشف ${row.patient_name}`,
          row.fee ?? req.doctor!.consultationFee ?? 0,
          row.patient_name,
          row.slot,
          "تم تسجيلها تلقائياً عند إكمال الموعد"
        );
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "فشل تحديث الموعد" });
  }
});

// --- Statistics ---
router.get("/stats", doctorAuthMiddleware, async (req, res) => {
  const db = await getDb();
  const { from, to } = req.query as { from?: string; to?: string };
  let totalQuery = "SELECT COUNT(*) as count FROM appointments WHERE doctor_id = ?";
  let periodQuery = "SELECT COUNT(*) as count FROM appointments WHERE doctor_id = ?";
  const params: string[] = [req.doctor!.id];
  const periodParams: string[] = [req.doctor!.id];

  if (from && to) {
    periodQuery += " AND slot >= ? AND slot <= ?";
    periodParams.push(from, to);
  } else if (from) {
    periodQuery += " AND slot >= ?";
    periodParams.push(from);
  } else if (to) {
    periodQuery += " AND slot <= ?";
    periodParams.push(to);
  }

  const total = (await db.prepare(totalQuery).get(...params) as { count: number }).count;
  const periodCount = (await db.prepare(periodQuery).get(...periodParams) as { count: number }).count;
  const approved = (await db.prepare("SELECT COUNT(*) as count FROM appointments WHERE doctor_id = ? AND status = 'approved'").get(req.doctor!.id) as { count: number }).count;
  const pending = (await db.prepare("SELECT COUNT(*) as count FROM appointments WHERE doctor_id = ? AND status = 'pending'").get(req.doctor!.id) as { count: number }).count;

  // Last month stats
  const lastMonthStart = new Date(); lastMonthStart.setMonth(lastMonthStart.getMonth() - 1); lastMonthStart.setDate(1); lastMonthStart.setHours(0, 0, 0, 0);
  const thisMonthStart = new Date(); thisMonthStart.setDate(1); thisMonthStart.setHours(0, 0, 0, 0);
  const lastMonthAppts = (await db.prepare("SELECT COUNT(*) as count FROM appointments WHERE doctor_id = ? AND slot >= ? AND slot < ?").get(req.doctor!.id, lastMonthStart.toISOString(), thisMonthStart.toISOString()) as { count: number }).count;
  const lastMonthRevenue = (await db.prepare("SELECT COALESCE(SUM(fee), 0) as c FROM appointments WHERE doctor_id = ? AND status = 'completed' AND slot >= ? AND slot < ?").get(req.doctor!.id, lastMonthStart.toISOString(), thisMonthStart.toISOString()) as { c: number }).c;
  const lastMonthPatients = (await db.prepare("SELECT COUNT(DISTINCT patient_name) as count FROM appointments WHERE doctor_id = ? AND slot >= ? AND slot < ?").get(req.doctor!.id, lastMonthStart.toISOString(), thisMonthStart.toISOString()) as { count: number }).count;

  // This month stats
  const thisMonthAppts = (await db.prepare("SELECT COUNT(*) as count FROM appointments WHERE doctor_id = ? AND slot >= ?").get(req.doctor!.id, thisMonthStart.toISOString()) as { count: number }).count;
  const thisMonthRevenue = (await db.prepare("SELECT COALESCE(SUM(fee), 0) as c FROM appointments WHERE doctor_id = ? AND status = 'completed' AND slot >= ?").get(req.doctor!.id, thisMonthStart.toISOString()) as { c: number }).c;

  res.json({
    total, period: periodCount, approved, pending,
    lastMonth: { appointments: lastMonthAppts, revenue: lastMonthRevenue, patients: lastMonthPatients },
    thisMonth: { appointments: thisMonthAppts, revenue: thisMonthRevenue },
  });
});

// --- Report ---
router.get("/report", doctorAuthMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const period = (req.query.period as string) || "3m";
    let months: number;
    if (period === "6m") months = 6;
    else if (period === "1y") months = 12;
    else months = 3;

    const startDate = new Date(); startDate.setMonth(startDate.getMonth() - months); startDate.setHours(0, 0, 0, 0);
    const start = startDate.toISOString();

    const totalAppointments = (await db.prepare("SELECT COUNT(*) as count FROM appointments WHERE doctor_id = ? AND slot >= ?").get(req.doctor!.id, start) as { count: number }).count;
    const completedAppointments = (await db.prepare("SELECT COUNT(*) as count FROM appointments WHERE doctor_id = ? AND status = 'completed' AND slot >= ?").get(req.doctor!.id, start) as { count: number }).count;
    const totalRevenue = (await db.prepare("SELECT COALESCE(SUM(fee), 0) as c FROM appointments WHERE doctor_id = ? AND status = 'completed' AND slot >= ?").get(req.doctor!.id, start) as { c: number }).c;
    const totalPatients = (await db.prepare("SELECT COUNT(DISTINCT patient_name) as count FROM appointments WHERE doctor_id = ? AND slot >= ?").get(req.doctor!.id, start) as { count: number }).count;
    const cancellations = (await db.prepare("SELECT COUNT(*) as count FROM appointments WHERE doctor_id = ? AND status = 'rejected' AND slot >= ?").get(req.doctor!.id, start) as { count: number }).count;
    const clinicPatients = (await db.prepare("SELECT COUNT(*) as count FROM doctor_clinic_patients WHERE doctor_id = ? AND created_at >= ?").get(req.doctor!.id, start) as { count: number }).count;
    const clinicRevenue = (await db.prepare("SELECT COALESCE(SUM(amount), 0) as c FROM clinic_financial_transactions WHERE doctor_id = ? AND type = 'income' AND transaction_date >= ?").get(req.doctor!.id, start) as { c: number }).c;
    const clinicExpenses = (await db.prepare("SELECT COALESCE(SUM(amount), 0) as c FROM clinic_financial_transactions WHERE doctor_id = ? AND type = 'expense' AND transaction_date >= ?").get(req.doctor!.id, start) as { c: number }).c;

    // Monthly breakdown
    const monthlyBreakdown: { month: string; appointments: number; revenue: number }[] = [];
    for (let i = 0; i < months; i++) {
      const mStart = new Date(startDate); mStart.setMonth(mStart.getMonth() + i);
      const mEnd = new Date(mStart); mEnd.setMonth(mEnd.getMonth() + 1);
      const mAppts = (await db.prepare("SELECT COUNT(*) as count FROM appointments WHERE doctor_id = ? AND slot >= ? AND slot < ?").get(req.doctor!.id, mStart.toISOString(), mEnd.toISOString()) as { count: number }).count;
      const mRev = (await db.prepare("SELECT COALESCE(SUM(fee), 0) as c FROM appointments WHERE doctor_id = ? AND status = 'completed' AND slot >= ? AND slot < ?").get(req.doctor!.id, mStart.toISOString(), mEnd.toISOString()) as { c: number }).c;
      monthlyBreakdown.push({
        month: mStart.toLocaleDateString("ar-SA", { month: "long", year: "numeric" }),
        appointments: mAppts,
        revenue: mRev,
      });
    }

    res.json({
      periodLabel: months === 12 ? "سنوي" : months === 6 ? "6 أشهر" : "3 أشهر",
      months,
      totalAppointments,
      completedAppointments,
      totalRevenue,
      totalPatients,
      cancellations,
      clinicPatients,
      clinicRevenue,
      clinicExpenses,
      netProfit: clinicRevenue - clinicExpenses,
      monthlyBreakdown,
    });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "فشل إنشاء التقرير" });
  }
});

// --- Medical Summaries ---
router.get("/summaries", doctorAuthMiddleware, async (req, res) => {
  const db = await getDb();
  const { from, to } = req.query as { from?: string; to?: string };
  let query = `
    SELECT ms.*, a.patient_name, a.slot
    FROM medical_summaries ms
    JOIN appointments a ON a.id = ms.appointment_id
    WHERE ms.doctor_id = ?`;
  const params: string[] = [req.doctor!.id];
  if (from) { query += " AND ms.created_at >= ?"; params.push(from); }
  if (to) { query += " AND ms.created_at <= ?"; params.push(to); }
  query += " ORDER BY ms.created_at DESC";
  const rows = await db.prepare(query).all(...params);
  res.json(rows);
});

router.put("/summaries/:id", doctorAuthMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const { content } = req.body as { content: string };
    if (!content?.trim()) {
      res.status(400).json({ error: "محتوى الملخص مطلوب" });
      return;
    }
    const existing = await db.prepare(
      "SELECT * FROM medical_summaries WHERE id = ? AND doctor_id = ?"
    ).get(req.params.id, req.doctor!.id);
    if (!existing) {
      res.status(404).json({ error: "الملخص غير موجود" });
      return;
    }
    await db.prepare(
      "UPDATE medical_summaries SET content = ?, edited_at = datetime('now') WHERE id = ? AND doctor_id = ?"
    ).run(content.trim(), req.params.id, req.doctor!.id);
    const updated = await db.prepare(`
      SELECT ms.*, a.patient_name, a.slot
      FROM medical_summaries ms
      JOIN appointments a ON a.id = ms.appointment_id
      WHERE ms.id = ?
    `).get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "فشل تحديث الملخص" });
  }
});

// --- Subscription ---
router.get("/subscription/plans", async (_req, res) => {
  const db = await getDb();
  const plans = await db.prepare("SELECT * FROM subscription_plans WHERE active = 1").all();
  res.json(plans.map((p: any) => ({ ...p, features: JSON.parse(p.features) })));
});

router.get("/subscription/my", doctorAuthMiddleware, async (req, res) => {
  const db = await getDb();
  let sub = await db.prepare(`
    SELECT ds.*, sp.name as plan_name, sp.description, sp.price_monthly, sp.price_yearly, sp.max_patients, sp.features
    FROM doctor_subscriptions ds
    JOIN subscription_plans sp ON sp.id = ds.plan_id
    WHERE ds.doctor_id = ? AND ds.active = 1
    ORDER BY ds.start_date DESC
    LIMIT 1
  `).get(req.doctor!.id) as any;

  // Auto-downgrade expired trial to Free
  if (sub && sub.is_trial === 1 && new Date(sub.end_date) < new Date()) {
    await db.prepare("UPDATE doctor_subscriptions SET active = 0 WHERE id = ?").run(sub.id);
    const freeId = generateId();
    await db.prepare(`
      INSERT INTO doctor_subscriptions (id, doctor_id, plan_id, start_date, end_date, is_trial)
      VALUES (?, ?, 'plan_free', datetime('now'), '2099-12-31 23:59:59', 0)
    `).run(freeId, req.doctor!.id);
    sub = await db.prepare(`
      SELECT ds.*, sp.name as plan_name, sp.description, sp.price_monthly, sp.price_yearly, sp.max_patients, sp.features
      FROM doctor_subscriptions ds
      JOIN subscription_plans sp ON sp.id = ds.plan_id
      WHERE ds.id = ?
    `).get(freeId) as any;
  }

  if (sub) sub.features = JSON.parse(sub.features);
  res.json(sub ?? null);
});

router.post("/subscription/subscribe", doctorAuthMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const { planId, yearly } = req.body as { planId?: string; yearly?: boolean };
    if (!planId) {
      res.status(400).json({ error: "معرف الباقة مطلوب" });
      return;
    }
    const plan = await db.prepare("SELECT * FROM subscription_plans WHERE id = ? AND active = 1").get(planId) as any;
    if (!plan) {
      res.status(404).json({ error: "الباقة غير موجودة" });
      return;
    }

    // deactivate old subscriptions
    await db.prepare("UPDATE doctor_subscriptions SET active = 0 WHERE doctor_id = ?").run(req.doctor!.id);

    const id = generateId();
    const months = yearly ? 12 : 1;
    await db.prepare(`
      INSERT INTO doctor_subscriptions (id, doctor_id, plan_id, start_date, end_date)
      VALUES (?, ?, ?, datetime('now'), datetime('now', '+' || ? || ' months'))
    `).run(id, req.doctor!.id, planId, months);

    res.json({ success: true, subscriptionId: id, plan: plan.name });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "فشل الاشتراك" });
  }
});

// --- Clinic Patients (doctor-managed records) ---
router.get("/patients", doctorAuthMiddleware, async (req, res) => {
  const db = await getDb();
  const { search, from, to } = req.query as { search?: string; from?: string; to?: string };
  let query = "SELECT * FROM doctor_clinic_patients WHERE doctor_id = ?";
  const params: string[] = [req.doctor!.id];
  if (search) { query += " AND (name LIKE ? OR phone LIKE ?)"; params.push(`%${search}%`, `%${search}%`); }
  if (from) { query += " AND created_at >= ?"; params.push(from); }
  if (to) { query += " AND created_at <= ?"; params.push(to); }
  query += " ORDER BY created_at DESC";
  const rows = await db.prepare(query).all(...params);
  res.json(rows);
});

router.post("/patients", doctorAuthMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const { name, phone, age, gender, history, notes } = req.body as Record<string, any>;
    if (!name?.trim()) { res.status(400).json({ error: "اسم المريض مطلوب" }); return; }
    const id = generateId();
    await db.prepare("INSERT INTO doctor_clinic_patients (id, doctor_id, name, phone, age, gender, history, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(id, req.doctor!.id, name.trim(), phone || null, age ? parseInt(age) : null, gender || null, history || null, notes || null);
    const row = await db.prepare("SELECT * FROM doctor_clinic_patients WHERE id = ?").get(id);
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "فشل إضافة المريض" });
  }
});

router.put("/patients/:id", doctorAuthMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const existing = await db.prepare("SELECT * FROM doctor_clinic_patients WHERE id = ? AND doctor_id = ?").get(req.params.id, req.doctor!.id);
    if (!existing) { res.status(404).json({ error: "المريض غير موجود" }); return; }
    const { name, phone, age, gender, history, notes } = req.body as Record<string, any>;
    if (name?.trim()) await db.prepare("UPDATE doctor_clinic_patients SET name = ? WHERE id = ?").run(name.trim(), req.params.id);
    if (phone !== undefined) await db.prepare("UPDATE doctor_clinic_patients SET phone = ? WHERE id = ?").run(phone || null, req.params.id);
    if (age !== undefined) await db.prepare("UPDATE doctor_clinic_patients SET age = ? WHERE id = ?").run(age ? parseInt(age) : null, req.params.id);
    if (gender !== undefined) await db.prepare("UPDATE doctor_clinic_patients SET gender = ? WHERE id = ?").run(gender || null, req.params.id);
    if (history !== undefined) await db.prepare("UPDATE doctor_clinic_patients SET history = ? WHERE id = ?").run(history || null, req.params.id);
    if (notes !== undefined) await db.prepare("UPDATE doctor_clinic_patients SET notes = ? WHERE id = ?").run(notes || null, req.params.id);
    const row = await db.prepare("SELECT * FROM doctor_clinic_patients WHERE id = ?").get(req.params.id);
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "فشل تحديث بيانات المريض" });
  }
});

router.get("/patients/:id", doctorAuthMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const patient = await db.prepare("SELECT * FROM doctor_clinic_patients WHERE id = ? AND doctor_id = ?").get(req.params.id, req.doctor!.id);
    if (!patient) { res.status(404).json({ error: "المريض غير موجود" }); return; }
    // Also fetch prescriptions for this patient
    const prescriptions = await db.prepare("SELECT * FROM prescriptions WHERE doctor_id = ? AND patient_id = ? ORDER BY created_at DESC").all(req.doctor!.id, req.params.id);
    // Also fetch appointments for this patient by matching name
    const appointments = await db.prepare("SELECT * FROM appointments WHERE doctor_id = ? AND patient_name = ? ORDER BY slot DESC").all(req.doctor!.id, (patient as any).name);
    const visits = await db.prepare("SELECT * FROM clinic_visits WHERE doctor_id = ? AND patient_id = ? ORDER BY visit_date DESC, created_at DESC").all(req.doctor!.id, req.params.id);
    const files = await db.prepare("SELECT * FROM patient_files WHERE doctor_id = ? AND patient_id = ? ORDER BY created_at DESC").all(req.doctor!.id, req.params.id);
    const financials = await db.prepare("SELECT * FROM clinic_financial_transactions WHERE doctor_id = ? AND patient_id = ? ORDER BY transaction_date DESC").all(req.doctor!.id, req.params.id);
    res.json({ patient, prescriptions, appointments, visits, files, financials });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "فشل جلب بيانات المريض" });
  }
});

router.post("/patients/:id/visits", doctorAuthMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const patient = await db.prepare("SELECT id FROM doctor_clinic_patients WHERE id = ? AND doctor_id = ?").get(req.params.id, req.doctor!.id);
    if (!patient) { res.status(404).json({ error: "المريض غير موجود" }); return; }
    const { visitDate, chiefComplaint, diagnosis, treatmentPlan, notes, followUpDate } = req.body as Record<string, any>;
    const id = generateId();
    await db.prepare(`
      INSERT INTO clinic_visits
      (id, doctor_id, patient_id, visit_date, chief_complaint, diagnosis, treatment_plan, notes, follow_up_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      req.doctor!.id,
      req.params.id,
      visitDate || new Date().toISOString(),
      chiefComplaint || null,
      diagnosis || null,
      treatmentPlan || null,
      notes || null,
      followUpDate || null
    );
    const row = await db.prepare("SELECT * FROM clinic_visits WHERE id = ?").get(id);
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "فشل تسجيل الكشف" });
  }
});

router.post("/patients/:id/files", doctorAuthMiddleware, upload.single("file"), async (req, res) => {
  try {
    const db = await getDb();
    const patient = await db.prepare("SELECT id FROM doctor_clinic_patients WHERE id = ? AND doctor_id = ?").get(req.params.id, req.doctor!.id);
    if (!patient) { res.status(404).json({ error: "المريض غير موجود" }); return; }
    const { fileType, title, notes } = req.body as Record<string, string>;
    if (!title?.trim()) { res.status(400).json({ error: "عنوان الملف مطلوب" }); return; }
    const validTypes = new Set(["prescription", "xray", "lab", "report", "other"]);
    const safeType = validTypes.has(fileType) ? fileType : "other";
    const id = generateId();
    await db.prepare(`
      INSERT INTO patient_files
      (id, doctor_id, patient_id, file_type, title, notes, file_path, original_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      req.doctor!.id,
      req.params.id,
      safeType,
      title.trim(),
      notes || null,
      req.file?.filename || null,
      req.file?.originalname || null
    );
    const row = await db.prepare("SELECT * FROM patient_files WHERE id = ?").get(id);
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "فشل رفع الملف" });
  }
});

// --- Clinic Finances ---
router.get("/finances", doctorAuthMiddleware, async (req, res) => {
  const db = await getDb();
  const { type, from, to } = req.query as { type?: string; from?: string; to?: string };
  let query = `
    SELECT ft.*, p.name as patient_name
    FROM clinic_financial_transactions ft
    LEFT JOIN doctor_clinic_patients p ON p.id = ft.patient_id
    WHERE ft.doctor_id = ?`;
  const params: string[] = [req.doctor!.id];
  if (type) { query += " AND ft.type = ?"; params.push(type); }
  if (from) { query += " AND ft.transaction_date >= ?"; params.push(from); }
  if (to) { query += " AND ft.transaction_date <= ?"; params.push(to); }
  query += " ORDER BY ft.transaction_date DESC, ft.created_at DESC";
  const rows = await db.prepare(query).all(...params);
  res.json(rows);
});

router.post("/finances", doctorAuthMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const { patientId, type, category, title, amount, paymentMethod, counterparty, status, transactionDate, dueDate, notes } = req.body as Record<string, any>;
    if (!title?.trim() || !category?.trim() || amount === undefined || Number.isNaN(Number(amount))) {
      res.status(400).json({ error: "العنوان والفئة والمبلغ مطلوبة" });
      return;
    }
    const safeType = type === "expense" ? "expense" : "income";
    const safeStatus = ["paid", "unpaid", "partial"].includes(status) ? status : "paid";
    if (patientId) {
      const patient = await db.prepare("SELECT id FROM doctor_clinic_patients WHERE id = ? AND doctor_id = ?").get(patientId, req.doctor!.id);
      if (!patient) { res.status(404).json({ error: "المريض غير موجود" }); return; }
    }
    const id = generateId();
    await db.prepare(`
      INSERT INTO clinic_financial_transactions
      (id, doctor_id, patient_id, type, category, title, amount, payment_method, counterparty, status, transaction_date, due_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      req.doctor!.id,
      patientId || null,
      safeType,
      category.trim(),
      title.trim(),
      Number(amount),
      paymentMethod || null,
      counterparty || null,
      safeStatus,
      transactionDate || new Date().toISOString(),
      dueDate || null,
      notes || null
    );
    const row = await db.prepare(`
      SELECT ft.*, p.name as patient_name
      FROM clinic_financial_transactions ft
      LEFT JOIN doctor_clinic_patients p ON p.id = ft.patient_id
      WHERE ft.id = ?
    `).get(id);
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "فشل تسجيل المعاملة المالية" });
  }
});

// --- Prescriptions ---
router.get("/prescriptions", doctorAuthMiddleware, async (req, res) => {
  const db = await getDb();
  const { patientId } = req.query as { patientId?: string };
  let rows;
  if (patientId) {
    rows = await db.prepare("SELECT * FROM prescriptions WHERE doctor_id = ? AND patient_id = ? ORDER BY created_at DESC").all(req.doctor!.id, patientId);
  } else {
    rows = await db.prepare("SELECT * FROM prescriptions WHERE doctor_id = ? ORDER BY created_at DESC").all(req.doctor!.id);
  }
  res.json(rows);
});

router.post("/prescriptions", doctorAuthMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const { patientId, patientName, patientPhone, medicationName, dosage, frequency, duration, notes } = req.body as Record<string, any>;
    if (!medicationName?.trim() || !patientName?.trim()) {
      res.status(400).json({ error: "اسم الدواء واسم المريض مطلوبان" });
      return;
    }
    const id = generateId();
    await db.prepare("INSERT INTO prescriptions (id, doctor_id, patient_id, patient_name, patient_phone, medication_name, dosage, frequency, duration, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(id, req.doctor!.id, patientId || null, patientName.trim(), patientPhone || null, medicationName.trim(), dosage || null, frequency || null, duration || null, notes || null);
    const row = await db.prepare("SELECT * FROM prescriptions WHERE id = ?").get(id);
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "فشل إضافة الوصفة الطبية" });
  }
});

router.put("/prescriptions/:id", doctorAuthMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const existing = await db.prepare("SELECT * FROM prescriptions WHERE id = ? AND doctor_id = ?").get(req.params.id, req.doctor!.id);
    if (!existing) { res.status(404).json({ error: "الوصفة غير موجودة" }); return; }
    const { medicationName, dosage, frequency, duration, notes } = req.body as Record<string, any>;
    if (medicationName?.trim()) await db.prepare("UPDATE prescriptions SET medication_name = ? WHERE id = ?").run(medicationName.trim(), req.params.id);
    if (dosage !== undefined) await db.prepare("UPDATE prescriptions SET dosage = ? WHERE id = ?").run(dosage || null, req.params.id);
    if (frequency !== undefined) await db.prepare("UPDATE prescriptions SET frequency = ? WHERE id = ?").run(frequency || null, req.params.id);
    if (duration !== undefined) await db.prepare("UPDATE prescriptions SET duration = ? WHERE id = ?").run(duration || null, req.params.id);
    if (notes !== undefined) await db.prepare("UPDATE prescriptions SET notes = ? WHERE id = ?").run(notes || null, req.params.id);
    const row = await db.prepare("SELECT * FROM prescriptions WHERE id = ?").get(req.params.id);
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "فشل تحديث الوصفة الطبية" });
  }
});

router.delete("/prescriptions/:id", doctorAuthMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const existing = await db.prepare("SELECT * FROM prescriptions WHERE id = ? AND doctor_id = ?").get(req.params.id, req.doctor!.id);
    if (!existing) { res.status(404).json({ error: "الوصفة غير موجودة" }); return; }
    await db.prepare("DELETE FROM prescriptions WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "فشل حذف الوصفة" });
  }
});

export default router;
