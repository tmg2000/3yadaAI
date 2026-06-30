# عيادة — مساعد طبي ذكي

تطبيق ويب عربي (RTL) + موبايل (Capacitor) يساعد المريض على:

1. **وصف الأعراض** عبر محادثة ذكية
2. **إعداد ملخص طبي** للطبيب
3. **اقتراح أطباء** حسب التخصص المناسب
4. **حجز موعد** مع الطبيب المختار

**الذكاء الاصطناعي الافتراضي:** [OpenRouter](https://openrouter.ai) + **Gemma 4 31B** (`google/gemma-4-31b-it`)

## المتطلبات

- Node.js 18+
- مفتاح [OpenRouter](https://openrouter.ai/keys) في `.env`

## التشغيل السريع

```bash
npm install
cp .env.example .env
# عدّل .env وأضف OPENROUTER_API_KEY
```

### الويب فقط

```bash
npm run dev
```

افتح: **http://localhost:5173**

- على الويب المحلي: `apiBaseUrl` فارغ في `public/app-config.json` (يستخدم Vite proxy تلقائياً).

### الويب + أندرويد معاً (أمر واحد)

```bash
npm run dev:all
```

يشغّل:

| الخدمة | العنوان |
|--------|---------|
| الويب | http://localhost:5173 |
| API | المنفذ 3001 (IP يُضبط تلقائياً في `app-config.json`) |
| أندرويد | live reload على المحاكي/الجهاز المتصل |

**ملاحظة:** `dev:all` يحتاج مجلد `android` وجهاز/محاكي. للويب فقط استخدم `npm run dev`.

### عند تغيّر IP الكمبيوتر (موبايل محلي فقط)

```bash
npm run config:host
npm run mobile:sync
```

## النشر على الإنترنت

```bash
npm run build
npm start
```

افتح **http://YOUR_SERVER:3001** — الواجهة والـ API من نفس العنوان (لا حاجة لإدخال IP).

على السيرفر عيّن متغيرات `.env` (`OPENROUTER_API_KEY`, `JWT_SECRET`, `PORT`, …) واحفظ مجلد `server/data` (قاعدة SQLite).

## تطبيق الموبايل (بناء APK)

```bash
npm run config:host
npm run mobile:sync
npm run mobile:android
```

## إعدادات الذكاء الاصطناعي (`.env`)

| المتغير | الوصف |
|---------|--------|
| `LLM_PROVIDER` | `openrouter` (افتراضي) أو `ollama` أو `gemini` |
| `OPENROUTER_API_KEY` | مفتاح OpenRouter |
| `OPENROUTER_MODEL` | `google/gemma-4-31b-it` أو `google/gemma-4-31b-it:free` |
| `OLLAMA_*` | عند استخدام Ollama محلياً |

## البنية

| المسار | الوصف |
|--------|--------|
| `server/llm/` | توجيه مزودي LLM (OpenRouter / Ollama / Gemini) |
| `server/index.ts` | API للمحادثة والأطباء والحجز |
| `public/app-config.json` | عنوان API اختياري (فارغ = نفس الموقع؛ للموبايل المحلي: `npm run config:host`) |
| `src/` | واجهة React عربية |

## إخلاء مسؤولية

هذا التطبيق **لا يقدّم تشخيصاً طبياً** ولا يصف علاجاً. في الطوارئ اتصل **997**.
