import { GoogleGenAI } from "@google/genai";
import { AIModel, FocusMode } from "./types";

/**
 * ✅ ENV VARS (Vite / Netlify)
 * - Gemini (Google):   VITE_GOOGLE_API_KEY
 * - xAI (Grok):        VITE_XAI_API_KEY   (or keep your old VITE_GROK_API_KEY)
 * - OpenAI:            VITE_OPENAI_API_KEY
 * - Anthropic:         VITE_ANTHROPIC_API_KEY
 * - Moonshot (Kimi):   VITE_MOONSHOT_API_KEY
 *
 * ✅ Optional base URL overrides
 * - xAI:        VITE_XAI_BASE_URL        default https://api.x.ai/v1
 * - OpenAI:     VITE_OPENAI_BASE_URL     default https://api.openai.com/v1
 * - Moonshot:   VITE_MOONSHOT_BASE_URL   default https://api.moonshot.ai/v1
 * - Anthropic:  VITE_ANTHROPIC_BASE_URL  default https://api.anthropic.com/v1
 * - Google:     VITE_GOOGLE_BASE_URL     default https://generativelanguage.googleapis.com/v1beta
 */

export const SYSTEM_INSTRUCTION = `
You are HYPERION_OMNI, a professional and advanced AI knowledge engine.
Your goal is to provide accurate, comprehensive, and well-structured information.
You MUST use the provided Google Search tools to find current information when relevant.
Always cite your sources implicitly by ensuring the response is grounded.
Format your response in clean Markdown.
Use bolding for key terms to allow for rapid scanning.
If the query is complex, break it down into logical sections.
Maintain a tone that is professional, objective, and helpful. Do not use sci-fi metaphors or pretend to be a neural interface unless explicitly in 'Grok' mode.
`;

export const getSystemInstructionForFocus = (mode: FocusMode): string => {
  switch (mode) {
    case "academic":
      return "Focus on peer-reviewed journals, research papers, and educational institutions. Prioritize depth and citation.";
    case "code":
      return "Focus on technical documentation, GitHub repositories, and StackOverflow. Provide clean, efficient code snippets.";
    case "writing":
      return "Focus on creative flow, grammar, and style. Act as an editor and muse.";
    case "social":
      return "Focus on public sentiment, social media trends, and real-time discussions.";
    default:
      return "";
  }
};

export type ProviderId = "google" | "xai" | "openai" | "anthropic" | "moonshot";

export const normalizeProvider = (providerLabel: string): ProviderId => {
  const p = (providerLabel || "").toLowerCase();

  if (p.includes("google") || p.includes("gemini")) return "google";
  if (p.includes("xai") || p.includes("grok")) return "xai";
  if (p.includes("openai") || p.includes("gpt")) return "openai";
  if (p.includes("anthropic") || p.includes("claude")) return "anthropic";
  if (p.includes("moonshot") || p.includes("kimi")) return "moonshot";

  // Default to google to avoid hard crashes on unexpected labels
  return "google";
};

const STORAGE_PREFIX = "hyperion_api_key__";

const safeLocalStorageGet = (key: string): string | null => {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeLocalStorageSet = (key: string, value: string) => {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
};

const safeLocalStorageRemove = (key: string) => {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
};

const getEnv = (name: string): string | undefined => {
  try {
    // @ts-ignore
    const v = typeof import.meta !== "undefined" ? import.meta.env?.[name] : undefined;
    return typeof v === "string" && v.trim() ? v : undefined;
  } catch {
    return undefined;
  }
};

export const getStoredApiKey = (provider: ProviderId): string | undefined => {
  const v = safeLocalStorageGet(`${STORAGE_PREFIX}${provider}`);
  return v && v.trim() ? v : undefined;
};

export const saveStoredApiKey = (provider: ProviderId, apiKey: string) => {
  if (!apiKey?.trim()) return;
  safeLocalStorageSet(`${STORAGE_PREFIX}${provider}`, apiKey.trim());
};

export const clearStoredApiKey = (provider: ProviderId) => {
  safeLocalStorageRemove(`${STORAGE_PREFIX}${provider}`);
};

export const getApiKeyForProvider = (provider: ProviderId): string | undefined => {
  // 1) Per-user stored key (best for public deployments)
  const stored = getStoredApiKey(provider);
  if (stored) return stored;

  // 2) Env fallback (bundled into client, only safe with restrictions/proxy)
  if (provider === "google") {
    return (
      getEnv("VITE_GOOGLE_API_KEY") ||
      getEnv("VITE_GEMINI_API_KEY") ||
      // legacy fallback
      getEnv("VITE_API_KEY") ||
      // @ts-ignore legacy dev fallback
      (typeof process !== "undefined" ? process.env?.API_KEY : undefined)
    );
  }

  if (provider === "xai") {
    return (
      getEnv("VITE_XAI_API_KEY") ||
      // your legacy name:
      getEnv("VITE_GROK_API_KEY") ||
      // @ts-ignore legacy dev fallback
      (typeof process !== "undefined" ? process.env?.XAI_API_KEY : undefined)
    );
  }

  if (provider === "openai") {
    return getEnv("VITE_OPENAI_API_KEY");
  }

  if (provider === "anthropic") {
    return getEnv("VITE_ANTHROPIC_API_KEY");
  }

  if (provider === "moonshot") {
    return getEnv("VITE_MOONSHOT_API_KEY");
  }

  return undefined;
};

export const requireApiKeyForProvider = (provider: ProviderId): string => {
  const key = getApiKeyForProvider(provider);
  if (!key) {
    throw new Error(`API key missing for provider: ${provider}`);
  }
  return key;
};

export const getOpenAICompatibleBaseUrl = (provider: ProviderId): string => {
  if (provider === "xai") return getEnv("VITE_XAI_BASE_URL") || "https://api.x.ai/v1";
  if (provider === "openai") return getEnv("VITE_OPENAI_BASE_URL") || "https://api.openai.com/v1";
  if (provider === "moonshot") return getEnv("VITE_MOONSHOT_BASE_URL") || "https://api.moonshot.ai/v1";
  if (provider === "anthropic") return getEnv("VITE_ANTHROPIC_BASE_URL") || "https://api.anthropic.com/v1";
  if (provider === "google") return getEnv("VITE_GOOGLE_BASE_URL") || "https://generativelanguage.googleapis.com/v1beta";
  return "";
};

export const hasAnyApiKey = (): boolean => {
  return (
    !!getApiKeyForProvider("google") ||
    !!getApiKeyForProvider("xai") ||
    !!getApiKeyForProvider("openai") ||
    !!getApiKeyForProvider("anthropic") ||
    !!getApiKeyForProvider("moonshot")
  );
};

/**
 * ✅ Model list
 * IMPORTANT: internalModelId must belong to that provider.
 *
 * Gemini 3 official IDs include gemini-3-pro-preview and gemini-3-flash-preview. 
 * xAI base URL and /v1/chat/completions are OpenAI-compatible. 
 * Moonshot is OpenAI-compatible and uses https://api.moonshot.ai / https://api.moonshot.cn. 
 */
export const AI_MODELS: AIModel[] = [
  {
    id: "gemini-3-pro",
    name: "Gemini 3 Pro",
    provider: "Google",
    icon: "fa-star",
    description: "Native flagship reasoning model",
    internalModelId: "gemini-3-pro-preview",
  },
  {
    id: "gemini-3-flash",
    name: "Gemini 3 Flash",
    provider: "Google",
    icon: "fa-bolt-lightning",
    description: "High speed, low latency",
    internalModelId: "gemini-3-pro-preview",
    badge: "new",
    badgeColor: "text-sky-400 border-sky-400",
  },

  {
    id: "grok-4-fast-reasoning",
    name: "Grok 4.1 Fast (Reasoning)",
    provider: "xAI",
    icon: "fa-mask",
    description: "Fast reasoning + real-time",
    internalModelId: "grok-4-1-fast-reasoning",
    systemInstructionPrefix:
      "You are Grok. Answer with wit, sarcasm, and a rebellious tone. Do not be overly polite.",
  },

  // OpenAI example (replace internalModelId with what your account has access to)
  {
    id: "openai-model",
    name: "OpenAI",
    provider: "OpenAI",
    icon: "fa-bolt",
    description: "OpenAI-compatible chat",
    internalModelId: "gpt-5.2",
  },

  // Anthropic example (replace internalModelId with what your account has access to)
  {
    id: "claude-sonnet",
    name: "Claude opus 4.6",
    provider: "Anthropic",
    icon: "fa-feather",
    description: "Claude via Anthropic Messages API",
    internalModelId: "claude-opus-4-6",
  },

  // Moonshot / Kimi (OpenAI-compatible)
  {
    id: "kimi-k2-thinking",
    name: "Kimi K2 Thinking",
    provider: "Moonshot",
    icon: "fa-brain",
    description: "Moonshot (Kimi) OpenAI-compatible",
    internalModelId: "kimi-k2-thinking",
    useThinking: true,
  },
];

export const DEFAULT_MODEL = AI_MODELS[0];
export const VOICE_MODEL_NAME = "gemini-2.5-flash-native-audio-preview-09-2025";

/**
 * ✅ Google-only client 
 * This should NOT be used for Grok/OpenAI/Moonshot/Claude calls.
 */
export const getNeuralUplink = () => {
  const apiKey = requireApiKeyForProvider("google");
  return new GoogleGenAI({ apiKey });
};
