import { Router } from "express";
import bcrypt from "bcryptjs";
import { getDb, generateId } from "../db.js";
import { adminAuthMiddleware, loginAdmin, seedAdmin } from "../admin-auth.js";
import { resolveBookableSlots } from "../slots.js";

const router = Router();

const SALT_ROUNDS = 10;

// Admin login (public)
router.post("/login", async (req, res) => {
  try {
    await seedAdmin();
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" });
      return;
    }
    const result = await loginAdmin(email, password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err instanceof Error ? err.message : "فشل تسجيل الدخول" });
  }
});

// Verify admin token
router.get("/me", adminAuthMiddleware, async (req, res) => {
  res.json({ admin: (req as any).admin });
});

// Dashboard stats
router.get("/dashboard", adminAuthMiddleware, async (_req, res) => {
  try {
  const db = await getDb();
  const totalUsers = (await db.prepare("SELECT COUNT(*) as c FROM users").get() as any).c;
  const totalDoctors = (await db.prepare("SELECT COUNT(*) as c FROM doctors").get() as any).c;
  const totalAppointments = (await db.prepare("SELECT COUNT(*) as c FROM appointments").get() as any).c;
  const totalConversations = (await db.prepare("SELECT COUNT(*) as c FROM conversations").get() as any).c;
  const pendingAppointments = (await db.prepare("SELECT COUNT(*) as c FROM appointments WHERE status = 'pending'").get() as any).c;
  const totalDoctorRevenue = (await db.prepare("SELECT COALESCE(SUM(fee), 0) as c FROM appointments WHERE status = 'completed'").get() as any).c;
  const totalPlatformRevenue = (await db.prepare(`
    SELECT COALESCE(SUM(sp.price_monthly), 0) as c FROM doctor_subscriptions ds
    JOIN subscription_plans sp ON sp.id = ds.plan_id
    WHERE ds.active = 1 AND sp.name != 'مجاني'
  `).get() as any).c;
  const verifiedDoctors = (await db.prepare("SELECT COUNT(*) as c FROM doctors WHERE is_verified = 1").get() as any).c;
  const activeSubscriptions = (await db.prepare("SELECT COUNT(*) as c FROM doctor_subscriptions WHERE active = 1 AND plan_id != 'plan_free'").get() as any).c;
  const totalAdmins = (await db.prepare("SELECT COUNT(*) as c FROM admins").get() as any).c;

  // Last month stats
  const lastMonthStart = new Date(); lastMonthStart.setMonth(lastMonthStart.getMonth() - 1); lastMonthStart.setDate(1); lastMonthStart.setHours(0, 0, 0, 0);
  const thisMonthStart = new Date(); thisMonthStart.setDate(1); thisMonthStart.setHours(0, 0, 0, 0);
  const lastMonthUsers = (await db.prepare("SELECT COUNT(*) as c FROM users WHERE created_at >= ? AND created_at < ?").get(lastMonthStart.toISOString(), thisMonthStart.toISOString()) as any).c;
  const lastMonthDoctors = (await db.prepare("SELECT COUNT(*) as c FROM doctors WHERE created_at >= ? AND created_at < ?").get(lastMonthStart.toISOString(), thisMonthStart.toISOString()) as any).c;
  const lastMonthAppts = (await db.prepare("SELECT COUNT(*) as c FROM appointments WHERE slot >= ? AND slot < ?").get(lastMonthStart.toISOString(), thisMonthStart.toISOString()) as any).c;
  const lastMonthRevenue = (await db.prepare("SELECT COALESCE(SUM(fee), 0) as c FROM appointments WHERE status = 'completed' AND slot >= ? AND slot < ?").get(lastMonthStart.toISOString(), thisMonthStart.toISOString()) as any).c;

  res.json({
    totalUsers, totalDoctors, totalAppointments, totalConversations,
    pendingAppointments, totalDoctorRevenue, totalPlatformRevenue,
    verifiedDoctors, activeSubscriptions, totalAdmins,
    lastMonth: { users: lastMonthUsers, doctors: lastMonthDoctors, appointments: lastMonthAppts, revenue: lastMonthRevenue },
  });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "فشل تحميل الإحصائيات" });
  }
});

// --- Admin Report ---
router.get("/report", adminAuthMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const period = (req.query.period as string) || "3m";
    let months: number;
    if (period === "6m") months = 6;
    else if (period === "1y") months = 12;
    else months = 3;

    const startDate = new Date(); startDate.setMonth(startDate.getMonth() - months); startDate.setHours(0, 0, 0, 0);
    const start = startDate.toISOString();

    const totalUsers = (await db.prepare("SELECT COUNT(*) as c FROM users WHERE created_at >= ?").get(start) as any).c;
    const totalDoctors = (await db.prepare("SELECT COUNT(*) as c FROM doctors WHERE created_at >= ?").get(start) as any).c;
    const totalAppointments = (await db.prepare("SELECT COUNT(*) as c FROM appointments WHERE slot >= ?").get(start) as any).c;
    const completedAppointments = (await db.prepare("SELECT COUNT(*) as c FROM appointments WHERE status = 'completed' AND slot >= ?").get(start) as any).c;
    const totalRevenue = (await db.prepare("SELECT COALESCE(SUM(fee), 0) as c FROM appointments WHERE status = 'completed' AND slot >= ?").get(start) as any).c;
    const totalConversations = (await db.prepare("SELECT COUNT(*) as c FROM conversations WHERE created_at >= ?").get(start) as any).c;
    const activeDoctors = (await db.prepare("SELECT COUNT(DISTINCT doctor_id) as c FROM appointments WHERE slot >= ?").get(start) as any).c;

    // Monthly breakdown
    const monthlyBreakdown: { month: string; users: number; doctors: number; appointments: number; revenue: number }[] = [];
    for (let i = 0; i < months; i++) {
      const mStart = new Date(startDate); mStart.setMonth(mStart.getMonth() + i);
      const mEnd = new Date(mStart); mEnd.setMonth(mEnd.getMonth() + 1);
      const mUsers = (await db.prepare("SELECT COUNT(*) as c FROM users WHERE created_at >= ? AND created_at < ?").get(mStart.toISOString(), mEnd.toISOString()) as any).c;
      const mDoctors = (await db.prepare("SELECT COUNT(*) as c FROM doctors WHERE created_at >= ? AND created_at < ?").get(mStart.toISOString(), mEnd.toISOString()) as any).c;
      const mAppts = (await db.prepare("SELECT COUNT(*) as c FROM appointments WHERE slot >= ? AND slot < ?").get(mStart.toISOString(), mEnd.toISOString()) as any).c;
      const mRev = (await db.prepare("SELECT COALESCE(SUM(fee), 0) as c FROM appointments WHERE status = 'completed' AND slot >= ? AND slot < ?").get(mStart.toISOString(), mEnd.toISOString()) as any).c;
      monthlyBreakdown.push({
        month: mStart.toLocaleDateString("ar-SA", { month: "long", year: "numeric" }),
        users: mUsers, doctors: mDoctors, appointments: mAppts, revenue: mRev,
      });
    }

    res.json({
      periodLabel: months === 12 ? "سنوي" : months === 6 ? "6 أشهر" : "3 أشهر",
      months,
      totalUsers, totalDoctors, totalAppointments, completedAppointments,
      totalRevenue, totalConversations, activeDoctors,
      monthlyBreakdown,
    });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "فشل إنشاء التقرير" });
  }
});

// --- Admins management ---
router.get("/admins", adminAuthMiddleware, async (_req, res) => {
  const db = await getDb();
  const admins = await db.prepare("SELECT id, name, email, role, created_at FROM admins ORDER BY created_at ASC").all();
  res.json(admins);
});

router.post("/admins", adminAuthMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const { name, email, password } = req.body as { name?: string; email?: string; password?: string };
    if (!name || !email || !password) {
      res.status(400).json({ error: "الاسم والبريد الإلكتروني وكلمة المرور مطلوبون" });
      return;
    }
    const existing = await db.prepare("SELECT id FROM admins WHERE email = ?").get(email);
    if (existing) {
      res.status(400).json({ error: "البريد الإلكتروني مستخدم بالفعل" });
      return;
    }
    const hash = bcrypt.hashSync(password, SALT_ROUNDS);
    await db.prepare("INSERT INTO admins (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, 'admin')").run(
      generateId(), name, email, hash
    );
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "فشل الإضافة" });
  }
});

router.delete("/admins/:id", adminAuthMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const admin = (req as any).admin;
    if (admin.id === req.params.id) {
      res.status(400).json({ error: "لا يمكن حذف نفسك" });
      return;
    }
    await db.prepare("DELETE FROM admins WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "فشل الحذف" });
  }
});

// Change admin password (requires current password)
router.put("/admins/:id/password", adminAuthMiddleware, async (req, res) => {
  try {
    const { password, currentPassword } = req.body as { password?: string; currentPassword?: string };
    if (!password || password.length < 4) {
      res.status(400).json({ error: "كلمة المرور يجب أن تكون 4 أحرف على الأقل" });
      return;
    }
    const db = await getDb();
    const admin = (req as any).admin;
    // Require current password verification
    const row = await db.prepare("SELECT password_hash FROM admins WHERE id = ?").get(admin.id) as any;
    if (!row || !bcrypt.compareSync(currentPassword || "", row.password_hash)) {
      res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });
      return;
    }
    const hash = bcrypt.hashSync(password, SALT_ROUNDS);
    await db.prepare("UPDATE admins SET password_hash = ? WHERE id = ?").run(hash, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "فشل تغيير كلمة المرور" });
  }
});

// --- Conversations ---
router.get("/conversations", adminAuthMiddleware, async (req, res) => {
  const db = await getDb();
  const userId = req.query.userId as string | undefined;
  const { from, to } = req.query as { from?: string; to?: string };

  if (userId) {
    let query = `
      SELECT c.*, u.name as user_name, u.email as user_email,
        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as messages_count
      FROM conversations c
      JOIN users u ON u.id = c.user_id
      WHERE c.user_id = ?`;
    const params: string[] = [userId];
    if (from) { query += " AND c.created_at >= ?"; params.push(from); }
    if (to) { query += " AND c.created_at <= ?"; params.push(to); }
    query += " ORDER BY c.updated_at DESC";
    const conversations = await db.prepare(query).all(...params);
    res.json({ conversations, total: (conversations as any[]).length });
    return;
  }

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const offset = (page - 1) * limit;

  let countQuery = "SELECT COUNT(*) as c FROM conversations c WHERE 1=1";
  let dataQuery = `
    SELECT c.*, u.name as user_name, u.email as user_email,
      (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as messages_count
    FROM conversations c
    JOIN users u ON u.id = c.user_id WHERE 1=1`;
  const countParams: string[] = [];
  const dataParams: string[] = [];
  if (from) { countQuery += " AND c.created_at >= ?"; countParams.push(from); dataQuery += " AND c.created_at >= ?"; dataParams.push(from); }
  if (to) { countQuery += " AND c.created_at <= ?"; countParams.push(to); dataQuery += " AND c.created_at <= ?"; dataParams.push(to); }
  const total = (await db.prepare(countQuery).get(...countParams) as any).c;
  dataQuery += " ORDER BY c.updated_at DESC LIMIT ? OFFSET ?";
  dataParams.push(String(limit), String(offset));
  const conversations = await db.prepare(dataQuery).all(...dataParams);
  res.json({ conversations, total, page, limit });
});

// Grouped conversations by user (MUST be before /:id route)
router.get("/conversations/grouped", adminAuthMiddleware, async (_req, res) => {
  const db = await getDb();
  const groups = await db.prepare(`
    SELECT u.id as user_id, u.name as user_name, u.email as user_email, u.phone as user_phone,
      COUNT(c.id) as conversation_count,
      MAX(c.updated_at) as last_message_at,
      (SELECT c2.title FROM conversations c2 WHERE c2.user_id = u.id ORDER BY c2.updated_at DESC LIMIT 1) as last_title
    FROM users u
    JOIN conversations c ON c.user_id = u.id
    GROUP BY u.id
    ORDER BY last_message_at DESC
  `).all() as any[];
  res.json(groups.map((g) => ({
    ...g,
    conversation_count: g.conversation_count,
    last_message_at: g.last_message_at,
  })));
});

// Single conversation with messages
router.get("/conversations/:id", adminAuthMiddleware, async (req, res) => {
  const db = await getDb();
  const conv = await db.prepare(`
    SELECT c.*, u.name as user_name, u.email as user_email, u.phone as user_phone
    FROM conversations c
    JOIN users u ON u.id = c.user_id
    WHERE c.id = ?
  `).get(req.params.id) as any;
  if (!conv) {
    res.status(404).json({ error: "المحادثة غير موجودة" });
    return;
  }
  const messages = await db.prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC").all(req.params.id);
  res.json({ ...conv, messages });
});

// --- Doctors ---

// Export doctors as CSV (no passwords)
router.get("/doctors/export", adminAuthMiddleware, async (_req, res) => {
  try {
    const db = await getDb();
    const doctors = await db.prepare(`
      SELECT id, name, specialty, specialty_key, hospital, city, area,
             license_number, rating, experience_years, consultation_fee,
             email, phone, bio, is_verified, accepted_insurances,
             available_slots, image, google_map_link
      FROM doctors ORDER BY name ASC
    `).all() as any[];

    const headers = ["الاسم","التخصص","المستشفى","المدينة","المنطقة","البريد الإلكتروني","الهاتف","رسوم الكشف","سنة التخرج","الترخيص","موثوق","جهات التأمين","السيرة الذاتية","المواعيد المتاحة"];
    const rows = doctors.map((d) => [
      d.name, d.specialty, d.hospital, d.city || "", d.area || "",
      d.email || "", d.phone || "", d.consultation_fee || 0, d.experience_years || 0,
      d.license_number || "", d.is_verified ? "نعم" : "لا",
      (JSON.parse(d.accepted_insurances || "[]") as string[]).join("; "),
      (d.bio || "").replace(/"/g, "'"),
      (JSON.parse(d.available_slots || "[]") as string[]).join("; "),
    ].map((v) => `"${v}"`).join(","));

    const csv = "\uFEFF" + headers.join(",") + "\n" + rows.join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="doctors-export-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "فشل تصدير الأطباء" });
  }
});

// Import doctors from CSV
router.post("/doctors/import", adminAuthMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const { csv } = req.body as { csv?: string };
    if (!csv) {
      res.status(400).json({ error: "ملف CSV مطلوب" });
      return;
    }

    const lines = csv.replace(/\r/g, "").split("\n").filter(Boolean);
    if (lines.length < 2) {
      res.status(400).json({ error: "الملف لا يحتوي على بيانات" });
      return;
    }

    // Parse CSV (simple: split by "," and strip quotes)
    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') { inQuotes = !inQuotes; continue; }
        if (c === "," && !inQuotes) { result.push(current.trim()); current = ""; continue; }
        current += c;
      }
      result.push(current.trim());
      return result;
    };

    const headerLine = parseLine(lines[0]);
    const colMap: Record<string, number> = {};
    headerLine.forEach((h, i) => { colMap[h.trim()] = i; });

    const getCol = (row: string[], key: string): string => {
      const idx = colMap[key];
      return idx !== undefined ? row[idx] || "" : "";
    };

    const defaultPasswordHash = bcrypt.hashSync("doctor123", SALT_ROUNDS);
    const insert = db.prepare(`
      INSERT OR IGNORE INTO doctors (id, name, specialty, specialty_key, hospital, city, area,
        license_number, rating, experience_years, consultation_fee, email, phone, bio,
        is_verified, accepted_insurances, available_slots, image, password_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let imported = 0;
    const tx = async () => {
      for (let i = 1; i < lines.length; i++) {
        const row = parseLine(lines[i]);
        if (row.length < 2) continue;
        const name = getCol(row, "الاسم") || getCol(row, "name");
        const specialty = getCol(row, "التخصص") || getCol(row, "specialty");
        if (!name || !specialty) continue;

        const id = generateId();
        await insert.run(
          id,
          name,
          specialty,
          (getCol(row, "التخصص") || getCol(row, "specialty")).toLowerCase().replace(/\s+/g, "_"),
          getCol(row, "المستشفى") || getCol(row, "hospital") || "غير محدد",
          getCol(row, "المدينة") || getCol(row, "city"),
          getCol(row, "المنطقة") || getCol(row, "area"),
          getCol(row, "الترخيص") || getCol(row, "license_number"),
          0, // rating
          parseInt(getCol(row, "سنة التخرج") || getCol(row, "experience_years")) || 0,
          parseFloat(getCol(row, "رسوم الكشف") || getCol(row, "consultation_fee")) || 0,
          getCol(row, "البريد الإلكتروني") || getCol(row, "email") || null,
          getCol(row, "الهاتف") || getCol(row, "phone"),
          getCol(row, "السيرة الذاتية") || getCol(row, "bio"),
          (getCol(row, "موثوق") || getCol(row, "is_verified")) === "نعم" ? 1 : 0,
          JSON.stringify((getCol(row, "جهات التأمين") || getCol(row, "accepted_insurances") || "").split("; ").filter(Boolean)),
          JSON.stringify((getCol(row, "المواعيد المتاحة") || getCol(row, "available_slots") || "").split("; ").filter(Boolean)),
          "👨‍⚕️",
          defaultPasswordHash,
        );
        imported++;
      }
    };
    await tx();

    res.json({ success: true, imported });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "فشل استيراد الأطباء" });
  }
});

// Full doctor detail with license info
router.get("/doctors/:id", adminAuthMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const doc = await db.prepare(`
      SELECT id, name, specialty, specialty_key as specialtyKey, hospital, city, area,
             license_number as licenseNumber, rating, experience_years as experienceYears,
             consultation_fee as consultationFee, email, phone, bio,
             id_card_path as idCardPath, license_doc_path as licenseDocPath,
             is_verified as isVerified, google_map_link as googleMapLink,
             accepted_insurances as acceptedInsurances, image, available_slots as availableSlots
      FROM doctors WHERE id = ?
    `).get(req.params.id) as any;
    if (!doc) {
      res.status(404).json({ error: "الطبيب غير موجود" });
      return;
    }
    doc.isVerified = doc.isVerified === 1;
    doc.acceptedInsurances = JSON.parse(doc.acceptedInsurances || "[]");
    doc.availableSlots = resolveBookableSlots(JSON.parse(doc.availableSlots || "[]"));

    // Get active subscription
    const sub = await db.prepare(`
      SELECT ds.*, sp.name as plan_name FROM doctor_subscriptions ds
      JOIN subscription_plans sp ON sp.id = ds.plan_id
      WHERE ds.doctor_id = ? AND ds.active = 1 LIMIT 1
    `).get(req.params.id);

    res.json({ ...doc, subscription: sub || null });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "فشل تحميل تفاصيل الطبيب" });
  }
});

router.get("/doctors", adminAuthMiddleware, async (req, res) => {
  const db = await getDb();
  const { search, verified, from, to } = req.query as { search?: string; verified?: string; from?: string; to?: string };
  let query = `
    SELECT id, name, specialty, specialty_key as specialtyKey, hospital, city, area,
           rating, experience_years as experienceYears, consultation_fee as consultationFee,
           email, phone, bio, is_verified as isVerified, accepted_insurances as acceptedInsurances,
           license_number as licenseNumber, created_at
    FROM doctors WHERE 1=1`;
  const params: string[] = [];
  if (search) { query += " AND (name LIKE ? OR specialty LIKE ? OR hospital LIKE ? OR phone LIKE ?)"; params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); }
  if (verified === "verified") { query += " AND is_verified = 1"; }
  if (verified === "unverified") { query += " AND is_verified = 0"; }
  if (from) { query += " AND created_at >= ?"; params.push(from); }
  if (to) { query += " AND created_at <= ?"; params.push(to); }
  query += " ORDER BY name ASC";
  const doctors = await db.prepare(query).all(...params);
  const result = (doctors as any[]).map((d) => ({
    ...d,
    isVerified: d.isVerified === 1,
    acceptedInsurances: JSON.parse(d.acceptedInsurances || "[]"),
  }));
  res.json(result);
});

// Update doctor
router.put("/doctors/:id", adminAuthMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const { name, specialty, hospital, city, area, consultationFee, isVerified, acceptedInsurances, licenseNumber, phone, bio, email } = req.body as Record<string, any>;
    const existing = await db.prepare("SELECT id FROM doctors WHERE id = ?").get(req.params.id);
    if (!existing) {
      res.status(404).json({ error: "الطبيب غير موجود" });
      return;
    }
    if (name !== undefined) await db.prepare("UPDATE doctors SET name = ? WHERE id = ?").run(name, req.params.id);
    if (specialty !== undefined) await db.prepare("UPDATE doctors SET specialty = ? WHERE id = ?").run(specialty, req.params.id);
    if (hospital !== undefined) await db.prepare("UPDATE doctors SET hospital = ? WHERE id = ?").run(hospital, req.params.id);
    if (city !== undefined) await db.prepare("UPDATE doctors SET city = ? WHERE id = ?").run(city, req.params.id);
    if (area !== undefined) await db.prepare("UPDATE doctors SET area = ? WHERE id = ?").run(area, req.params.id);
    if (consultationFee !== undefined) await db.prepare("UPDATE doctors SET consultation_fee = ? WHERE id = ?").run(consultationFee, req.params.id);
    if (isVerified !== undefined) await db.prepare("UPDATE doctors SET is_verified = ? WHERE id = ?").run(isVerified ? 1 : 0, req.params.id);
    if (acceptedInsurances !== undefined) await db.prepare("UPDATE doctors SET accepted_insurances = ? WHERE id = ?").run(JSON.stringify(acceptedInsurances), req.params.id);
    if (licenseNumber !== undefined) await db.prepare("UPDATE doctors SET license_number = ? WHERE id = ?").run(licenseNumber, req.params.id);
    if (phone !== undefined) await db.prepare("UPDATE doctors SET phone = ? WHERE id = ?").run(phone, req.params.id);
    if (bio !== undefined) await db.prepare("UPDATE doctors SET bio = ? WHERE id = ?").run(bio, req.params.id);
    if (email !== undefined) await db.prepare("UPDATE doctors SET email = ? WHERE id = ?").run(email, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "فشل التحديث" });
  }
});

// Assign subscription to doctor
router.post("/doctors/:id/subscription", adminAuthMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const { planId, endDate } = req.body as { planId?: string; endDate?: string };
    if (!planId) {
      res.status(400).json({ error: "معرف الباقة مطلوب" });
      return;
    }
    const doctor = await db.prepare("SELECT id FROM doctors WHERE id = ?").get(req.params.id);
    if (!doctor) {
      res.status(404).json({ error: "الطبيب غير موجود" });
      return;
    }
    const plan = await db.prepare("SELECT * FROM subscription_plans WHERE id = ?").get(planId) as any;
    if (!plan) {
      res.status(404).json({ error: "الباقة غير موجودة" });
      return;
    }
    // Deactivate old subscriptions
    await db.prepare("UPDATE doctor_subscriptions SET active = 0 WHERE doctor_id = ? AND active = 1").run(req.params.id);
    // Create new subscription
    const id = generateId();
    const end = endDate || "2099-12-31 23:59:59";
    await db.prepare(`
      INSERT INTO doctor_subscriptions (id, doctor_id, plan_id, start_date, end_date, is_trial)
      VALUES (?, ?, ?, datetime('now'), ?, 0)
    `).run(id, req.params.id, planId, end);
    res.json({ success: true, subscriptionId: id, plan: plan.name });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "فشل تحديث الاشتراك" });
  }
});

// Change doctor password
router.put("/doctors/:id/password", adminAuthMiddleware, async (req, res) => {
  try {
    const { password } = req.body as { password?: string };
    if (!password || password.length < 4) {
      res.status(400).json({ error: "كلمة المرور يجب أن تكون 4 أحرف على الأقل" });
      return;
    }
    const db = await getDb();
    const hash = bcrypt.hashSync(password, SALT_ROUNDS);
    await db.prepare("UPDATE doctors SET password_hash = ? WHERE id = ?").run(hash, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "فشل تغيير كلمة المرور" });
  }
});

// Delete doctor
router.delete("/doctors/:id", adminAuthMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    await db.prepare("DELETE FROM doctors WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "فشل الحذف" });
  }
});

// --- Patients ---
router.get("/patients", adminAuthMiddleware, async (req, res) => {
  const db = await getDb();
  const { search, from, to } = req.query as { search?: string; from?: string; to?: string };
  let query = `
    SELECT u.id, u.name, u.email, u.phone, u.date_of_birth, u.gender, u.created_at,
      (SELECT COUNT(*) FROM conversations WHERE user_id = u.id) as conversations_count,
      (SELECT COUNT(*) FROM appointments WHERE user_id = u.id) as appointments_count
    FROM users u WHERE 1=1`;
  const params: string[] = [];
  if (search) { query += " AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)"; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (from) { query += " AND u.created_at >= ?"; params.push(from); }
  if (to) { query += " AND u.created_at <= ?"; params.push(to); }
  query += " ORDER BY u.created_at DESC";
  const patients = await db.prepare(query).all(...params);
  res.json(patients.map((p: any) => ({ ...p, phone: p.phone || "" })));
});

// Patient detail
router.get("/patients/:id", adminAuthMiddleware, async (req, res) => {
  const db = await getDb();
  const patient = await db.prepare("SELECT id, name, email, phone, date_of_birth, gender, created_at FROM users WHERE id = ?").get(req.params.id) as any;
  if (!patient) {
    res.status(404).json({ error: "المريض غير موجود" });
    return;
  }
  const conversations = await db.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as messages_count
    FROM conversations c WHERE c.user_id = ? ORDER BY c.updated_at DESC
  `).all(req.params.id);
  const appointments = await db.prepare(`
    SELECT a.*, d.name as doctor_name FROM appointments a
    LEFT JOIN doctors d ON d.id = a.doctor_id
    WHERE a.user_id = ? ORDER BY a.created_at DESC
  `).all(req.params.id);
  res.json({ ...patient, conversations, appointments });
});

// Change patient password
router.put("/patients/:id/password", adminAuthMiddleware, async (req, res) => {
  try {
    const { password } = req.body as { password?: string };
    if (!password || password.length < 4) {
      res.status(400).json({ error: "كلمة المرور يجب أن تكون 4 أحرف على الأقل" });
      return;
    }
    const db = await getDb();
    const hash = bcrypt.hashSync(password, SALT_ROUNDS);
    await db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "فشل تغيير كلمة المرور" });
  }
});

// --- Appointments ---
router.get("/appointments", adminAuthMiddleware, async (req, res) => {
  const db = await getDb();
  const { status, search, from, to } = req.query as { status?: string; search?: string; from?: string; to?: string };
  let query = `
    SELECT a.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
      COALESCE(d.name, a.doctor_name) as doctor_name
    FROM appointments a
    JOIN users u ON u.id = a.user_id
    LEFT JOIN doctors d ON d.id = a.doctor_id
    WHERE 1=1`;
  const params: string[] = [];
  if (status) { query += " AND a.status = ?"; params.push(status); }
  if (search) { query += " AND (u.name LIKE ? OR u.phone LIKE ? OR d.name LIKE ? OR a.patient_name LIKE ?)"; params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); }
  if (from) { query += " AND a.slot >= ?"; params.push(from); }
  if (to) { query += " AND a.slot <= ?"; params.push(to); }
  query += " ORDER BY a.created_at DESC LIMIT 200";
  const appointments = await db.prepare(query).all(...params);
  res.json(appointments);
});

// Update appointment status & details
router.put("/appointments/:id", adminAuthMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const { status, slot, doctorName, patientName, phone, fee } = req.body as Record<string, any>;
    const existing = await db.prepare("SELECT id FROM appointments WHERE id = ?").get(req.params.id);
    if (!existing) {
      res.status(404).json({ error: "الموعد غير موجود" });
      return;
    }
    if (status !== undefined) await db.prepare("UPDATE appointments SET status = ? WHERE id = ?").run(status, req.params.id);
    if (slot !== undefined) await db.prepare("UPDATE appointments SET slot = ? WHERE id = ?").run(slot, req.params.id);
    if (doctorName !== undefined) await db.prepare("UPDATE appointments SET doctor_name = ? WHERE id = ?").run(doctorName, req.params.id);
    if (patientName !== undefined) await db.prepare("UPDATE appointments SET patient_name = ? WHERE id = ?").run(patientName, req.params.id);
    if (phone !== undefined) await db.prepare("UPDATE appointments SET phone = ? WHERE id = ?").run(phone, req.params.id);
    if (fee !== undefined) await db.prepare("UPDATE appointments SET fee = ? WHERE id = ?").run(fee, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "فشل التحديث" });
  }
});

// --- Subscriptions ---
router.get("/subscriptions", adminAuthMiddleware, async (req, res) => {
  const db = await getDb();
  const { active, from, to } = req.query as { active?: string; from?: string; to?: string };
  let query = `
    SELECT ds.*, sp.name as plan_name, d.name as doctor_name, d.email as doctor_email
    FROM doctor_subscriptions ds
    JOIN subscription_plans sp ON sp.id = ds.plan_id
    JOIN doctors d ON d.id = ds.doctor_id
    WHERE 1=1`;
  const params: string[] = [];
  if (active === "1") { query += " AND ds.active = 1"; }
  if (active === "0") { query += " AND ds.active = 0"; }
  if (from) { query += " AND ds.start_date >= ?"; params.push(from); }
  if (to) { query += " AND ds.start_date <= ?"; params.push(to); }
  query += " ORDER BY ds.start_date DESC LIMIT 200";
  const subscriptions = await db.prepare(query).all(...params);
  res.json(subscriptions);
});

router.get("/subscription-plans", adminAuthMiddleware, async (_req, res) => {
  const db = await getDb();
  const plans = await db.prepare("SELECT * FROM subscription_plans").all();
  res.json((plans as any[]).map((p) => ({ ...p, features: JSON.parse(p.features) })));
});

export default router;
