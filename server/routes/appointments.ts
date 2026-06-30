import { Router } from "express";
import { authMiddleware } from "../auth.js";
import { getDb, generateId } from "../db.js";
import { isSlotBookable, resolveBookableSlots } from "../slots.js";

const router = Router();
router.use(authMiddleware);

router.get("/", async (req, res) => {
  const db = await getDb();
  const rows = await db
    .prepare(`
      SELECT a.*, d.google_map_link as googleMapLink
      FROM appointments a
      LEFT JOIN doctors d ON d.id = a.doctor_id
      WHERE a.user_id = ?
      ORDER BY a.slot DESC
    `)
    .all(req.user!.id);
  res.json(rows);
});

router.post("/", async (req, res) => {
  const { doctorId, doctorName, specialty, hospital, city, slot, patientName, phone, fee, sessionId } = req.body as Record<string, unknown>;
  if (!doctorId || !slot || !patientName?.toString().trim()) {
    res.status(400).json({ error: "بيانات الحجز غير مكتملة" });
    return;
  }

  const db = await getDb();
  const doctor = await db.prepare("SELECT available_slots FROM doctors WHERE id = ?").get(doctorId) as
    | { available_slots: string }
    | undefined;
  if (!doctor) {
    res.status(404).json({ error: "الطبيب غير موجود" });
    return;
  }

  const allowed = resolveBookableSlots(JSON.parse(doctor.available_slots || "[]") as string[]);
  const slotStr = String(slot);
  if (!isSlotBookable(slotStr) || !allowed.includes(slotStr)) {
    res.status(400).json({
      error: "الموعد غير متاح. اختر موعداً خلال الأيام القادمة فقط.",
    });
    return;
  }
  const id = generateId();
  const sid = sessionId as string | undefined;

  await db.prepare(
    `INSERT INTO appointments (id, user_id, session_id, doctor_id, doctor_name, specialty, hospital, city, slot, patient_name, phone, fee)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, req.user!.id, sid ?? null, doctorId, doctorName ?? "", specialty ?? "", hospital ?? "",
    city ?? null, slot, patientName.toString().trim(), phone?.toString().trim() ?? null, fee ?? null
  );

  // Update session status
  if (sid) {
    await db.prepare("UPDATE sessions SET status = 'completed', updated_at = datetime('now') WHERE id = ? AND user_id = ?")
      .run(sid, req.user!.id);
  }

  // Auto-create clinic patient record if not exists (so booked patients appear in doctor's patient list)
  const existingPatient = await db.prepare(
    "SELECT id FROM doctor_clinic_patients WHERE doctor_id = ? AND name = ?"
  ).get(doctorId, patientName.toString().trim());
  if (!existingPatient) {
    const patientId = generateId();
    await db.prepare(
      "INSERT INTO doctor_clinic_patients (id, doctor_id, name, phone) VALUES (?, ?, ?, ?)"
    ).run(patientId, doctorId, patientName.toString().trim(), phone?.toString().trim() ?? null);
  }

  // If session has a summary, insert into medical_summaries (so doctor can see it)
  if (sid) {
    const session = await db.prepare("SELECT summary_json FROM sessions WHERE id = ? AND user_id = ?").get(sid, req.user!.id) as { summary_json: string } | undefined;
    if (session?.summary_json) {
      const summaryId = generateId();
      await db.prepare(
        "INSERT INTO medical_summaries (id, appointment_id, doctor_id, user_id, content) VALUES (?, ?, ?, ?, ?)"
      ).run(summaryId, id, doctorId, req.user!.id, session.summary_json);
    }
  }

  const row = await db.prepare("SELECT * FROM appointments WHERE id = ?").get(id);
  res.json({ success: true, appointment: row });
});

// Patient requests modification to their appointment
router.put("/:id/request-modify", async (req, res) => {
  try {
    const db = await getDb();
    const appt = await db.prepare("SELECT * FROM appointments WHERE id = ? AND user_id = ?").get(req.params.id, req.user!.id) as any;
    if (!appt) {
      res.status(404).json({ error: "الموعد غير موجود" });
      return;
    }
    const { slot, patientName, phone } = req.body as Record<string, string>;
    if (slot) await db.prepare("UPDATE appointments SET slot = ? WHERE id = ?").run(slot, req.params.id);
    if (patientName) await db.prepare("UPDATE appointments SET patient_name = ? WHERE id = ?").run(patientName, req.params.id);
    if (phone) await db.prepare("UPDATE appointments SET phone = ? WHERE id = ?").run(phone, req.params.id);
    await db.prepare("UPDATE appointments SET status = 'modification_requested' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "فشل طلب التعديل" });
  }
});

export default router;
