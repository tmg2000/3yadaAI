import { Router } from "express";
import { authMiddleware } from "../auth.js";
import { getDb, generateId } from "../db.js";

const router = Router();
router.use(authMiddleware);

router.get("/", (req, res) => {
  const db = getDb();
  const rows = db
    .prepare("SELECT id, title, created_at, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC")
    .all(req.user!.id);
  res.json(rows);
});

router.post("/", (req, res) => {
  const db = getDb();
  const id = generateId();
  const title = (req.body as { title?: string }).title?.trim() || "استشارة جديدة";
  db.prepare("INSERT INTO conversations (id, user_id, title) VALUES (?, ?, ?)").run(id, req.user!.id, title);
  res.json({ id, title, created_at: new Date().toISOString() });
});

router.get("/:id", (req, res) => {
  const db = getDb();
  const conv = db
    .prepare("SELECT * FROM conversations WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.user!.id) as Record<string, unknown> | undefined;
  if (!conv) {
    res.status(404).json({ error: "المحادثة غير موجودة" });
    return;
  }
  const messages = db
    .prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC")
    .all(req.params.id);
  res.json({ ...conv, messages });
});

router.delete("/:id", (req, res) => {
  const db = getDb();
  const result = db
    .prepare("DELETE FROM conversations WHERE id = ? AND user_id = ?")
    .run(req.params.id, req.user!.id);
  if (result.changes === 0) {
    res.status(404).json({ error: "المحادثة غير موجودة" });
    return;
  }
  res.json({ success: true });
});

router.patch("/:id", (req, res) => {
  const db = getDb();
  const title = (req.body as { title?: string }).title?.trim();
  if (!title) {
    res.status(400).json({ error: "العنوان مطلوب" });
    return;
  }
  const result = db
    .prepare("UPDATE conversations SET title = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?")
    .run(title, req.params.id, req.user!.id);
  if (result.changes === 0) {
    res.status(404).json({ error: "المحادثة غير موجودة" });
    return;
  }
  res.json({ success: true, title });
});

export default router;
