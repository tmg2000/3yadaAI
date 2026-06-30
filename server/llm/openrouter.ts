import { buildSystemInstruction, parseLlmJson, fallbackLlmResponse } from "./prompt.js";
import type { PatientProfileContext } from "../patientProfile.js";
import type { ChatMessage, LlmChatResponse } from "./types.js";

const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL?.replace(/\/+$/, "") || "https://openrouter.ai/api/v1";
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL?.trim() || "google/gemma-4-31b-it";

function getApiKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY?.trim();
}

export function getOpenRouterModel(): string {
  return OPENROUTER_MODEL;
}

export async function checkOpenRouterHealth(): Promise<boolean> {
  const apiKey = getApiKey();
  if (!apiKey) return false;
  try {
    const res = await fetch(`${OPENROUTER_BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
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
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY غير مُعرّف. أضف المفتاح في ملف .env");
  }

  const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.APP_PUBLIC_URL || "http://localhost:5173",
      "X-Title": process.env.APP_NAME || "3yada-ai-clinic",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{ role: "system", content: systemInstruction }, ...messages],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`OpenRouter API error: ${res.status} ${res.statusText} ${errBody.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}

export async function chatWithOpenRouter(
  history: ChatMessage[],
  userMessage: string,
  patientContext?: PatientProfileContext
): Promise<LlmChatResponse> {
  const systemInstruction = buildSystemInstruction(patientContext);
  const messages = history.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
  }));
  messages.push({ role: "user", content: userMessage });

  const text = await chatCompletion(messages, systemInstruction);
  return parseLlmJson(text) ?? fallbackLlmResponse();
}

export async function getInitialGreetingOpenRouter(
  patientContext?: PatientProfileContext
): Promise<LlmChatResponse> {
  return chatWithOpenRouter([], "ابدأ المحادثة واسأل المريض مباشرة عن الأعراض التي يشعر بها.", patientContext);
}
