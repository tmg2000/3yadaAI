import { buildSystemInstruction, parseLlmJson, fallbackLlmResponse } from "./prompt.js";
import type { PatientProfileContext } from "../patientProfile.js";
import type { ChatMessage, LlmChatResponse } from "./types.js";

const TOGETHER_BASE_URL =
  process.env.TOGETHER_BASE_URL?.replace(/\/+$/, "") || "https://api.together.xyz/v1";
const TOGETHER_MODEL =
  process.env.TOGETHER_MODEL?.trim() || "Qwen/Qwen3-80B";

function getApiKey(): string | undefined {
  return process.env.TOGETHER_API_KEY?.trim();
}

export function getTogetherModel(): string {
  return TOGETHER_MODEL;
}

export async function checkTogetherHealth(): Promise<boolean> {
  const apiKey = getApiKey();
  if (!apiKey) return false;
  try {
    const res = await fetch(`${TOGETHER_BASE_URL}/models`, {
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
    throw new Error("TOGETHER_API_KEY غير مُعرّف. أضف المفتاح في ملف .env");
  }

  const res = await fetch(`${TOGETHER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: TOGETHER_MODEL,
      messages: [{ role: "system", content: systemInstruction }, ...messages],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Together AI API error: ${res.status} ${res.statusText} ${errBody.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}

export async function chatWithTogether(
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

export async function getInitialGreetingTogether(
  patientContext?: PatientProfileContext
): Promise<LlmChatResponse> {
  return chatWithTogether([], "ابدأ المحادثة واسأل المريض مباشرة عن الأعراض التي يشعر بها.", patientContext);
}
