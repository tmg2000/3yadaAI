import { Router } from "express";
import { registerUser, loginUser, authMiddleware, toSafeUser } from "../auth.js";
import { getDb } from "../db.js";
import type { UserRow } from "../auth.js";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body as { name?: string; email?: string; password?: string };
    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      res.status(400).json({ error: "جميع الحقول مطلوبة" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
      return;
    }
    const user = await registerUser(name.trim(), email.trim().toLowerCase(), password);
    const { token } = await loginUser(email.trim().toLowerCase(), password);
    res.json({ user, token });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "فشل إنشاء الحساب";
    res.status(400).json({ error: msg });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email?.trim() || !password?.trim()) {
      res.status(400).json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" });
      return;
    }
    const result = await loginUser(email.trim().toLowerCase(), password);
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "فشل تسجيل الدخول";
    res.status(401).json({ error: msg });
  }
});

router.get("/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

router.put("/me", authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const { name, date_of_birth, gender, phone, age, health_insurance } = req.body as {
      name?: string;
      date_of_birth?: string | null;
      gender?: string | null;
      phone?: string | null;
      age?: number | null;
      health_insurance?: string | null;
    };
    if (name?.trim()) {
      db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name.trim(), req.user!.id);
    }
    db.prepare(
      "UPDATE users SET date_of_birth = ?, gender = ?, phone = ?, age = ?, health_insurance = ? WHERE id = ?"
    ).run(
      date_of_birth ?? null,
      gender ?? null,
      phone ?? null,
      age != null && age > 0 ? Math.round(age) : null,
      health_insurance?.trim() || null,
      req.user!.id
    );
    const row = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user!.id) as UserRow;
    res.json({ user: toSafeUser(row) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "فشل تحديث الملف";
    res.status(400).json({ error: msg });
  }
});

export default router;
