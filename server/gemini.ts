import { buildSystemInstruction } from "./llm/prompt.js";
import type { PatientProfileContext } from "./patientProfile.js";
import type { LlmChatResponse, MedicalSummary } from "./llm/types.js";

const MODEL_ID = "gemini-2.5-flash";

type GeminiSdk = typeof import("@google/generative-ai");

let sdkPromise: Promise<GeminiSdk> | null = null;

async function loadGeminiSdk(): Promise<GeminiSdk> {
  if (!sdkPromise) {
    sdkPromise = import("@google/generative-ai").catch((err: unknown) => {
      sdkPromise = null;
      const msg =
        err instanceof Error && "code" in err && err.code === "ERR_MODULE_NOT_FOUND"
          ? 'حزمة @google/generative-ai غير مثبتة. شغّل: npm install @google/generative-ai — أو غيّر LLM_PROVIDER إلى openrouter في .env'
          : err instanceof Error
            ? err.message
            : "فشل تحميل Gemini SDK";
      throw new Error(msg);
    });
  }
  return sdkPromise;
}

function buildResponseSchema(SchemaType: GeminiSdk["SchemaType"]) {
  return {
    type: SchemaType.OBJECT,
    properties: {
      message: {
        type: SchemaType.STRING,
        description: "رد المساعد للمريض بالعربية، ودود وواضح",
      },
      phase: {
        type: SchemaType.STRING,
        description: "consultation | ready_for_summary",
      },
      summary: {
        type: SchemaType.OBJECT,
        nullable: true,
        properties: {
          patientConcerns: { type: SchemaType.STRING },
          symptoms: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          duration: { type: SchemaType.STRING },
          severity: { type: SchemaType.STRING },
          additionalNotes: { type: SchemaType.STRING },
          urgencyLevel: {
            type: SchemaType.STRING,
            description: "low | medium | high | emergency",
          },
          recommendedSpecialties: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          preferredCity: { type: SchemaType.STRING, nullable: true },
          preferredInsurance: { type: SchemaType.STRING, nullable: true },
          doctorBrief: { type: SchemaType.STRING },
        },
      },
      profileUpdates: {
        type: SchemaType.OBJECT,
        nullable: true,
        properties: {
          age: { type: SchemaType.NUMBER, nullable: true },
          healthInsurance: { type: SchemaType.STRING, nullable: true },
          dateOfBirth: { type: SchemaType.STRING, nullable: true },
        },
      },
    },
    required: ["message", "phase"],
  };
}

let genAI: InstanceType<GeminiSdk["GoogleGenerativeAI"]> | null = null;

async function getClient(GoogleGenerativeAI: GeminiSdk["GoogleGenerativeAI"]) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY غير مُعرّف. أضف المفتاح في ملف .env");
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type { MedicalSummary };
export type GeminiChatResponse = LlmChatResponse;

export async function chatWithGemini(
  history: ChatMessage[],
  userMessage: string,
  patientContext?: PatientProfileContext
): Promise<GeminiChatResponse> {
  const { GoogleGenerativeAI, SchemaType } = await loadGeminiSdk();
  const client = await getClient(GoogleGenerativeAI);
  const responseSchema = buildResponseSchema(SchemaType);

  const model = client.getGenerativeModel({
    model: MODEL_ID,
    systemInstruction: buildSystemInstruction(patientContext),
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  });

  const contents = history.map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("model" as const),
    parts: [{ text: m.content }],
  }));
  contents.push({ role: "user", parts: [{ text: userMessage }] });

  const result = await model.generateContent({ contents });
  const text = result.response.text();

  try {
    return JSON.parse(text) as GeminiChatResponse;
  } catch {
    return {
      message: "عذراً، حدث خطأ في معالجة الرد. هل يمكنك إعادة صياغة ما تشعر به؟",
      phase: "consultation",
    };
  }
}

export async function getInitialGreeting(
  patientContext?: PatientProfileContext
): Promise<GeminiChatResponse> {
  return chatWithGemini([], "ابدأ المحادثة واسأل المريض مباشرة عن الأعراض التي يشعر بها.", patientContext);
}
