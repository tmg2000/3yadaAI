import {
  chatWithOllama,
  getInitialGreeting as getInitialGreetingOllama,
  checkOllamaHealth,
  extractFileText,
} from "../ollama.js";
import {
  chatWithOpenRouter,
  getInitialGreetingOpenRouter,
  checkOpenRouterHealth,
  getOpenRouterModel,
} from "./openrouter.js";
import type { PatientProfileContext } from "../patientProfile.js";
import type { ChatMessage, LlmChatResponse } from "./types.js";

export type { ChatMessage, MedicalSummary, LlmChatResponse } from "./types.js";
export { extractFileText };

export type LlmProvider = "openrouter" | "ollama" | "gemini";

export function getLlmProvider(): LlmProvider {
  const raw = (process.env.LLM_PROVIDER || "openrouter").trim().toLowerCase();
  if (raw === "ollama" || raw === "gemini" || raw === "openrouter") return raw;
  return "openrouter";
}

export function getLlmModel(): string {
  switch (getLlmProvider()) {
    case "openrouter":
      return getOpenRouterModel();
    case "ollama":
      return process.env.OLLAMA_MODEL?.trim() || "qwen2.5";
    case "gemini":
      return "gemini-2.5-flash";
    default:
      return getOpenRouterModel();
  }
}

export async function checkLlmHealth(): Promise<boolean> {
  switch (getLlmProvider()) {
    case "openrouter":
      return checkOpenRouterHealth();
    case "ollama":
      return checkOllamaHealth();
    case "gemini":
      return Boolean(process.env.GEMINI_API_KEY?.trim());
    default:
      return false;
  }
}

export async function chatWithLlm(
  history: ChatMessage[],
  userMessage: string,
  patientContext?: PatientProfileContext
): Promise<LlmChatResponse> {
  switch (getLlmProvider()) {
    case "openrouter":
      return chatWithOpenRouter(history, userMessage, patientContext);
    case "ollama":
      return chatWithOllama(history, userMessage, patientContext);
    case "gemini": {
      const { chatWithGemini } = await import("../gemini.js");
      return chatWithGemini(history, userMessage, patientContext);
    }
    default:
      return chatWithOpenRouter(history, userMessage, patientContext);
  }
}

export async function getInitialGreeting(
  patientContext?: PatientProfileContext
): Promise<LlmChatResponse> {
  switch (getLlmProvider()) {
    case "openrouter":
      return getInitialGreetingOpenRouter(patientContext);
    case "ollama":
      return getInitialGreetingOllama(patientContext);
    case "gemini": {
      const { getInitialGreeting: getInitialGreetingGemini } = await import("../gemini.js");
      return getInitialGreetingGemini(patientContext);
    }
    default:
      return getInitialGreetingOpenRouter(patientContext);
  }
}
