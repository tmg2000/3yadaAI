import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import { existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, extname } from "path";
import {
  chatWithLlm,
  getInitialGreeting,
  checkLlmHealth,
  extractFileText,
  getLlmProvider,
  getLlmModel,
  type ChatMessage,
} from "./llm/index.js";
import { authMiddleware } from "./auth.js";
import { adminAuthMiddleware } from "./admin-auth.js";
import { getDb, generateId, resetDb } from "./db.js";
import {
  getPatientProfileContext,
  applyProfileUpdates,
} from "./patientProfile.js";
import { stripProfileUpdates } from "./llm/prompt.js";
import authRoutes from "./routes/auth.js";
import conversationRoutes from "./routes/conversations.js";
import appointmentRoutes from "./routes/appointments.js";
import doctorRoutes from "./routes/doctors.js";
import adminRoutes from "./routes/admin.js";
import { normalizeSpecialtyKeys } from "./specialties.js";
import { resolveBookableSlots } from "./slots.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST?.trim() || "0.0.0.0";

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const uploadsDir = join(__dirname, "uploads");
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
      cb(new Error("فقط الصور وملفات PDF مسموح بها"));
    }
  },
});

app.use("/uploads", express.static(uploadsDir));

app.get("/api/health", async (_req, res) => {
  const aiOk = await checkLlmHealth();
  const provider = getLlmProvider();
  const model = getLlmModel();
  res.json({
    ok: aiOk,
    ollamaConfigured: aiOk,
    aiConfigured: aiOk,
    provider,
    model,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/admin", adminRoutes);

app.post("/api/sessions", authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const sessionId = generateId();
    const { title } = req.body as { title?: string };
    db.prepare("INSERT INTO sessions (id, user_id, title, status) VALUES (?, ?, ?, 'in_progress')").run(
      sessionId, req.user!.id, title || "استشارة جديدة"
    );
    res.json({ sessionId });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "فشل إنشاء الجلسة" });
  }
});

app.get("/api/sessions", authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const sessions = db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM conversations WHERE session_id = s.id) as conversation_count,
        (SELECT COUNT(*) FROM appointments WHERE session_id = s.id) as appointment_count,
        (SELECT a.doctor_name FROM appointments a WHERE a.session_id = s.id LIMIT 1) as doctor_name,
        (SELECT a.status FROM appointments a WHERE a.session_id = s.id LIMIT 1) as appointment_status
      FROM sessions s
      WHERE s.user_id = ?
      ORDER BY s.updated_at DESC
    `).all(req.user!.id);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "فشل تحميل الجلسات" });
  }
});

app.get("/api/sessions/:id", authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const session = db.prepare("SELECT * FROM sessions WHERE id = ? AND user_id = ?").get(req.params.id, req.user!.id) as any;
    if (!session) {
      res.status(404).json({ error: "الجلسة غير موجودة" });
      return;
    }
    const conversations = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as messages_count,
        (SELECT content FROM messages WHERE conversation_id = c.id AND role = 'assistant' ORDER BY created_at ASC LIMIT 1) as first_message
      FROM conversations c WHERE c.session_id = ? ORDER BY c.created_at ASC
    `).all(req.params.id);
    const appointments = db.prepare(`
      SELECT a.*, d.name as doctor_name, d.hospital, d.city
      FROM appointments a
      LEFT JOIN doctors d ON d.id = a.doctor_id
      WHERE a.session_id = ? ORDER BY a.created_at ASC
    `).all(req.params.id);
    res.json({ ...session, conversations, appointments });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "فشل تحميل الجلسة" });
  }
});

app.put("/api/sessions/:id", authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const { summary, status } = req.body as { summary?: any; status?: string };
    if (summary !== undefined) {
      db.prepare("UPDATE sessions SET summary_json = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?")
        .run(JSON.stringify(summary), req.params.id, req.user!.id);
    }
    if (status !== undefined) {
      db.prepare("UPDATE sessions SET status = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?")
        .run(status, req.params.id, req.user!.id);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "فشل تحديث الجلسة" });
  }
});

app.post("/api/chat/start", authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const convId = generateId();
    const userId = req.user!.id;
    const { sessionId } = req.body as { sessionId?: string };

    // Create session if not provided
    let sid = sessionId;
    if (!sid) {
      sid = generateId();
      db.prepare("INSERT INTO sessions (id, user_id, title, status) VALUES (?, ?, ?, 'in_progress')").run(
        sid, userId, "استشارة جديدة"
      );
    }

    db.prepare("INSERT INTO conversations (id, user_id, session_id) VALUES (?, ?, ?)").run(convId, userId, sid);

    const patientContext = getPatientProfileContext(userId);
    const rawResponse = await getInitialGreeting(patientContext);
    applyProfileUpdates(userId, rawResponse.profileUpdates ?? undefined);
    const response = stripProfileUpdates(rawResponse);
    db.prepare("INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)").run(
      generateId(), convId, "assistant", response.message
    );
    db.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").run(convId);
    db.prepare("UPDATE sessions SET updated_at = datetime('now') WHERE id = ?").run(sid);

    res.json({ ...response, conversationId: convId, sessionId: sid });
  } catch (err) {
    console.error("chat/start error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "فشل الاتصال بخدمة الذكاء الاصطناعي",
    });
  }
});

app.post("/api/chat/:conversationId", authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const convId = req.params.conversationId;
    const conv = db.prepare("SELECT id FROM conversations WHERE id = ? AND user_id = ?").get(convId, req.user!.id);
    if (!conv) {
      res.status(404).json({ error: "المحادثة غير موجودة" });
      return;
    }

    const { history: rawHistory, message: msg } = req.body as {
      history?: ChatMessage[];
      message?: string;
    };
    const history: ChatMessage[] = rawHistory ?? [];

    if (!msg?.trim()) {
      res.status(400).json({ error: "الرسالة مطلوبة" });
      return;
    }

    db.prepare("INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)").run(
      generateId(), convId, "user", msg.trim()
    );

    const userId = req.user!.id;
    const patientContext = getPatientProfileContext(userId);
    const rawResponse = await chatWithLlm(history, msg.trim(), patientContext);
    applyProfileUpdates(userId, rawResponse.profileUpdates ?? undefined);
    const response = stripProfileUpdates(rawResponse);
    db.prepare("INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)").run(
      generateId(), convId, "assistant", response.message
    );
    db.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").run(convId);
    res.json(response);
  } catch (err) {
    console.error("chat error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "فشل الاتصال بخدمة الذكاء الاصطناعي",
    });
  }
});

app.post("/api/chat/:conversationId/upload", authMiddleware, upload.array("files", 5), async (req, res) => {
  try {
    const db = getDb();
    const convId = req.params.conversationId;
    const conv = db.prepare("SELECT id FROM conversations WHERE id = ? AND user_id = ?").get(convId, req.user!.id);
    if (!conv) {
      res.status(404).json({ error: "المحادثة غير موجودة" });
      return;
    }

    const rawHistory = req.body.history;
    let parsedHistory: ChatMessage[] = [];
    if (rawHistory) {
      const raw = typeof rawHistory === "string" ? JSON.parse(rawHistory) : rawHistory;
      if (Array.isArray(raw)) {
        parsedHistory = raw.filter((m: any) => typeof m?.role === "string" && typeof m?.content === "string");
      }
    }
    const history: ChatMessage[] = parsedHistory;
    let message = (req.body.message as string) ?? "";
    const files = req.files as Express.Multer.File[];

    if (!message.trim() && (!files || files.length === 0)) {
      res.status(400).json({ error: "الرسالة أو الملف مطلوب" });
      return;
    }

    const attachments = files?.length
      ? files.map((f) => ({ name: f.originalname, path: f.filename }))
      : undefined;

    db.prepare("INSERT INTO messages (id, conversation_id, role, content, attachments) VALUES (?, ?, ?, ?, ?)").run(
      generateId(), convId, "user", message, attachments ? JSON.stringify(attachments) : null
    );

    if (files && files.length > 0) {
      const fileTexts = await Promise.all(
        files.map((f) => extractFileText(f.path, f.mimetype))
      );
      const extracted = fileTexts.filter(Boolean).join("\n\n");
      message = message.trim() ? `${message}\n\n${extracted}` : extracted;
    }

    const userId = req.user!.id;
    const patientContext = getPatientProfileContext(userId);
    const rawResponse = await chatWithLlm(history, message.trim(), patientContext);
    applyProfileUpdates(userId, rawResponse.profileUpdates ?? undefined);
    const response = stripProfileUpdates(rawResponse);
    db.prepare("INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)").run(
      generateId(), convId, "assistant", response.message
    );
    db.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").run(convId);
    res.json(response);
  } catch (err) {
    console.error("chat/upload error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "فشل الاتصال بخدمة الذكاء الاصطناعي",
    });
  }
});

app.get("/api/doctors", (req, res) => {
  const db = getDb();
  const specialties = req.query.specialties as string | undefined;
  const city = req.query.city as string | undefined;
  const insurance = req.query.insurance as string | undefined;
  const keys = normalizeSpecialtyKeys(specialties?.split(",").filter(Boolean) ?? []);

  let cityFilter = "";
  const cityParams: string[] = [];
  if (city?.trim()) {
    cityFilter = " AND city LIKE ?";
    cityParams.push(`%${city.trim()}%`);
  }

  let rows: Array<Record<string, unknown>>;
  if (keys.length > 0) {
    const placeholders = keys.map(() => "?").join(",");
    rows = db
      .prepare(
        `SELECT * FROM doctors WHERE specialty_key IN (${placeholders})${cityFilter} ORDER BY rating DESC, experience_years DESC`
      )
      .all(...keys, ...cityParams) as Array<Record<string, unknown>>;
    // لا نُكمّل من تخصصات أخرى — فقط الأطباء المطابقون للتخصص المطلوب
  } else {
    rows = db
      .prepare(
        `SELECT * FROM doctors${cityFilter ? " WHERE 1=1" + cityFilter : ""} ORDER BY rating DESC LIMIT 20`
      )
      .all(...cityParams) as Array<Record<string, unknown>>;
  }

  let result = rows.map((r) => {
    const acceptedInsurances: string[] = JSON.parse((r.accepted_insurances as string) || "[]");
    return {
      id: r.id, name: r.name, specialty: r.specialty,
      specialtyKey: r.specialty_key, hospital: r.hospital, city: r.city,
      area: r.area ?? null, licenseNumber: r.license_number ?? null,
      rating: r.rating, experienceYears: r.experience_years,
      consultationFee: r.consultation_fee,
      availableSlots: resolveBookableSlots(
        JSON.parse((r.available_slots as string) || "[]") as string[]
      ),
      image: r.image,
      acceptedInsurances,
    };
  });

  // Filter by insurance if provided — prefer doctors that accept it, then show others
  if (insurance?.trim()) {
    const insName = insurance.trim();
    const matching = result.filter((d: any) =>
      d.acceptedInsurances.some((i: string) => i.includes(insName) || insName.includes(i))
    );
    const others = result.filter((d: any) =>
      !d.acceptedInsurances.some((i: string) => i.includes(insName) || insName.includes(i))
    );
    result = [...matching, ...others];
  }

  res.json(result);
});

// DB Reset endpoint (admin-only in production)
app.post("/api/reset-db", adminAuthMiddleware, (_req, res) => {
  try {
    resetDb();
    res.json({ success: true, message: "تم إعادة تعيين قاعدة البيانات بنجاح" });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "فشل إعادة التعيين" });
  }
});

/** واجهة الويب المبنية (npm run build) — نشر على الإنترنت من منفذ واحد */
const clientDist = join(__dirname, "..", "dist");
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api|\/uploads).*/, (_req, res, next) => {
    const indexHtml = join(clientDist, "index.html");
    if (existsSync(indexHtml)) {
      res.sendFile(indexHtml);
      return;
    }
    next();
  });
}

app.listen(PORT, HOST, () => {
  console.log(`🩺 عيادة API يعمل على المنفذ ${PORT} (جميع الواجهات: ${HOST})`);
  console.log(`   محلي: http://localhost:${PORT}`);
  if (existsSync(clientDist)) {
    console.log(`   الويب: http://localhost:${PORT} (واجهة + API من نفس العنوان)`);
  }
  console.log(`🤖 الذكاء الاصطناعي: ${getLlmProvider()} / ${getLlmModel()}`);
});
