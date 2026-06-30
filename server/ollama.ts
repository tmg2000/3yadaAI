import { readFileSync } from "fs";
import { extname } from "path";
import { buildSystemInstruction, parseLlmJson, fallbackLlmResponse } from "./llm/prompt.js";
import type { PatientProfileContext } from "./patientProfile.js";
import type { ChatMessage, LlmChatResponse, MedicalSummary } from "./llm/types.js";

export type { ChatMessage, MedicalSummary };
export type OllamaChatResponse = LlmChatResponse;

const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL?.trim() || "qwen2.5";

export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function chatCompletion(
  messages: { role: string; content: string }[],
  systemInstruction: string
): Promise<string> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemInstruction },
        ...messages,
      ],
      stream: false,
      format: "json",
      options: {
        temperature: 0.7,
        num_predict: 2048,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.message?.content ?? "";
}

export async function chatWithOllama(
  history: ChatMessage[],
  userMessage: string,
  patientContext?: PatientProfileContext
): Promise<OllamaChatResponse> {
  const systemInstruction = buildSystemInstruction(patientContext);
  const messages = history.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
  }));
  messages.push({ role: "user", content: userMessage });

  const text = await chatCompletion(messages, systemInstruction);
  return parseLlmJson(text) ?? fallbackLlmResponse();
}

export async function getInitialGreeting(
  patientContext?: PatientProfileContext
): Promise<OllamaChatResponse> {
  return chatWithOllama([], "ابدأ المحادثة واسأل المريض مباشرة عن الأعراض التي يشعر بها.", patientContext);
}

export async function extractFileText(
  filePath: string,
  mimeType: string
): Promise<string> {
  const ext = extname(filePath).toLowerCase();

  if (ext === ".pdf") {
    try {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: readFileSync(filePath) });
      const result = await parser.getText();
      parser.destroy();
      const text = result.text?.trim() || "";
      return text
        ? `[محتوى ملف PDF]:\n${text.slice(0, 20000)}`
        : "[ملف PDF فارغ أو غير قابل للقراءة]";
    } catch {
      return "[تعذر قراءة ملف PDF]";
    }
  }

  if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
    return "[أرفق المستخدم صورة، ولكن نموذج الذكاء الاصطناعي لا يدعم معالجة الصور. أخبر المستخدم أنك لا تستطيع رؤية الصورة واطلب منه وصفها كتابياً.]";
  }

  return "[أرفق المستخدم ملفاً غير مدعوم]";
}
