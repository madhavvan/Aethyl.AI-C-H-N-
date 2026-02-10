// src/services/aiService.ts
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { SYSTEM_INSTRUCTION, getSystemInstructionForFocus } from "../constants";
import { Source, AIModel, FocusMode, Attachment, UserProfile } from "../types";

export interface SearchResponse {
  text: string;
  sources: Source[];
  images?: string[];
}

/** -----------------------------
 * Provider endpoints (browser-side)
 * ----------------------------- */
const PROVIDER_URLS: Record<string, string> = {
  xai: "https://api.x.ai/v1/chat/completions",
  openai: "https://api.openai.com/v1/chat/completions",
  moonshot: "https://api.moonshot.ai/v1/chat/completions",
  anthropic: "https://api.anthropic.com/v1/messages",
};

const GEMINI_INLINE_SUPPORTED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
  "audio/wav",
  "audio/mp3",
  "audio/aiff",
  "audio/aac",
  "audio/ogg",
  "audio/flac",
  "video/mp4",
  "video/mpeg",
  "video/mov",
  "video/avi",
  "video/x-flv",
  "video/mpg",
  "video/webm",
  "video/wmv",
  "video/3gpp",
];

/** -----------------------------
 * Env helper (Vite-safe)
 * ----------------------------- */
const getEnvKey = (name: string): string | undefined => {
  try {
    // @ts-ignore
    const v = typeof import.meta !== "undefined" ? import.meta.env?.[name] : undefined;
    return typeof v === "string" && v.trim() ? v : undefined;
  } catch {
    return undefined;
  }
};

/** -----------------------------
 * Provider normalization
 * Your models use provider labels like: 'Google', 'xAI', 'OpenAI', 'Moonshot', 'Anthropic'
 * ----------------------------- */
const normalizeProvider = (providerLabel: string): "google" | "xai" | "openai" | "moonshot" | "anthropic" => {
  const p = (providerLabel || "").toLowerCase();

  if (p.includes("google") || p.includes("gemini")) return "google";
  if (p.includes("xai") || p.includes("grok")) return "xai";
  if (p.includes("openai") || p.includes("gpt")) return "openai";
  if (p.includes("moonshot") || p.includes("kimi")) return "moonshot";
  if (p.includes("anthropic") || p.includes("claude")) return "anthropic";

  // default safe choice
  return "google";
};

/** -----------------------------
 * API key retrieval
 * Priority:
 * 1) userProfile.apiKeys[providerKey]
 * 2) env vars (VITE_*)
 * ----------------------------- */
const getApiKeyForProvider = (
  providerLabel: string,
  userProfile: UserProfile
): { providerKey: ReturnType<typeof normalizeProvider>; apiKey?: string } => {
  const providerKey = normalizeProvider(providerLabel);

  // 1) BYOK via user profile
  const profileKey = userProfile.apiKeys?.[providerKey];
  if (profileKey && profileKey.trim()) return { providerKey, apiKey: profileKey.trim() };

  // 2) env fallback (Vite)
  if (providerKey === "google") {
    return {
      providerKey,
      apiKey: getEnvKey("VITE_GOOGLE_API_KEY") || getEnvKey("VITE_GEMINI_API_KEY") || getEnvKey("VITE_API_KEY"),
    };
  }

  if (providerKey === "xai") {
    return {
      providerKey,
      apiKey: getEnvKey("VITE_XAI_API_KEY") || getEnvKey("VITE_GROK_API_KEY"),
    };
  }

  if (providerKey === "openai") {
    return { providerKey, apiKey: getEnvKey("VITE_OPENAI_API_KEY") };
  }

  if (providerKey === "moonshot") {
    return { providerKey, apiKey: getEnvKey("VITE_MOONSHOT_API_KEY") };
  }

  if (providerKey === "anthropic") {
    return { providerKey, apiKey: getEnvKey("VITE_ANTHROPIC_API_KEY") };
  }

  return { providerKey, apiKey: undefined };
};

/** -----------------------------
 * SSE reader
 * ----------------------------- */
async function* sseLines(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      yield line.trimEnd();
    }
  }

  if (buffer.length > 0) yield buffer.trimEnd();
}

/** -----------------------------
 * History conversion
 * ----------------------------- */
function mapHistoryToOpenAIStyle(history: { role: string; parts: { text: string }[] }[]) {
  return history
    .map((h) => ({
      role: h.role === "model" ? "assistant" : "user",
      content: (h.parts || []).map((p) => p?.text ?? "").join(""),
    }))
    .filter((m) => m.content.trim().length > 0);
}

/** -----------------------------
 * System instruction builder (preserves your logic)
 * ----------------------------- */
function buildSystemInstruction(selectedModel: AIModel, userProfile: UserProfile, focusMode: FocusMode) {
  let systemInstruction = SYSTEM_INSTRUCTION;

  if (selectedModel.systemInstructionPrefix) {
    systemInstruction = `${selectedModel.systemInstructionPrefix}\n\n${systemInstruction}`;
  }

  if (userProfile.aboutMe?.trim()) {
    systemInstruction += `\n\nUSER CONTEXT:\n${userProfile.aboutMe}`;
  }

  if (userProfile.customInstructions?.trim()) {
    systemInstruction += `\n\nUSER PREFERENCES:\n${userProfile.customInstructions}`;
  }

  const focusInst = getSystemInstructionForFocus(focusMode);
  if (focusInst) {
    systemInstruction += `\n\nFOCUS MODE (${focusMode.toUpperCase()}): ${focusInst}`;
  }

  return systemInstruction;
}

/** -----------------------------
 * Title generation
 * Keep it cheap and stable: default to truncated query
 * (You can later make this provider-aware if you want.)
 * ----------------------------- */
export const generateChatTitle = async (query: string, _responseContext: string): Promise<string> => {
  return query.length > 40 ? query.substring(0, 40) + "..." : query;
};

/** -----------------------------
 * Main function (provider router)
 * ----------------------------- */
export const performDeepSearch = async (
  query: string,
  history: { role: string; parts: { text: string }[] }[],
  attachments: Attachment[],
  selectedModel: AIModel,
  userProfile: UserProfile,
  focusMode: FocusMode = "all",
  onChunk?: (text: string) => void
): Promise<SearchResponse> => {
  try {
    const { providerKey, apiKey } = getApiKeyForProvider(selectedModel.provider, userProfile);

    if (!apiKey) {
      throw new Error(`Missing API Key for ${selectedModel.provider}. Please add it in Settings > API Keys.`);
    }

    const systemInstruction = buildSystemInstruction(selectedModel, userProfile, focusMode);

    // Prepare attachment text (used by non-Gemini providers)
    const contextParts: string[] = [];
    for (const att of attachments) {
      if (att.isText) {
        contextParts.push(`\n[FILE: ${att.name}]\n${att.data}\n[END FILE]\n`);
      } else {
        contextParts.push(`\n[BINARY FILE: ${att.name} (${att.type}) - Content Omitted in Text Stream]\n`);
      }
    }
    const finalQuery = `${contextParts.join("\n")}\n\n${query}`.trim();

    /** =========================
     * A) GOOGLE / GEMINI
     * ========================= */
    if (providerKey === "google") {
      const ai = new GoogleGenAI({ apiKey });
      const modelId = selectedModel.internalModelId;

      // 1) Build Gemini contents
      const contents: any[] = history.map((h) => ({
        role: h.role,
        parts: h.parts,
      }));

      // Current message parts (restore full multimodal support here)
      const currentParts: any[] = [];

      for (const att of attachments) {
        if (att.isText) {
          currentParts.push({
            text: `\n\n--- FILE ATTACHMENT: ${att.name} ---\n${att.data}\n--- END ATTACHMENT ---\n\n`,
          });
        } else {
          if (GEMINI_INLINE_SUPPORTED_TYPES.includes(att.type)) {
            currentParts.push({
              inlineData: {
                mimeType: att.type,
                data: att.data, // base64
              },
            });
          } else {
            console.warn(`Skipping attachment ${att.name}: Unsupported MIME type for Gemini inlineData: ${att.type}`);
            // Optional: still pass a note to the model
            currentParts.push({
              text: `\n\n[NOTE] Attachment skipped (unsupported type): ${att.name} (${att.type})\n\n`,
            });
          }
        }
      }

      if (finalQuery) currentParts.push({ text: finalQuery });
      contents.push({ role: "user", parts: currentParts });

      // 2) Config (Gemini supports googleSearch tool)
      const config: any = {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        // omitting maxOutputTokens implies "unlimited" (provider default max)
      };

      if (selectedModel.useThinking) {
        config.thinkingConfig = { thinkingBudget: 8192 };
        // For thinking models, ensure we don't accidentally cap it if defaults change
        // We set a high ceiling (e.g., 8192 or higher if supported) to allow thinking + generation
        config.generationConfig = { maxOutputTokens: 30000 };
      }

      // 3) Stream
      const responseStream = await ai.models.generateContentStream({
        model: modelId,
        contents,
        config,
      });

      let fullText = "";
      const images: string[] = [];
      const sources: Source[] = [];
      const sourceMap = new Set<string>();

      for await (const chunk of responseStream) {
        const c = chunk as GenerateContentResponse;

        if (c.text) {
          fullText += c.text;
          onChunk?.(fullText);
        }

        // Collect images from inlineData parts (if model returns images)
        if (c.candidates?.[0]?.content?.parts) {
          for (const part of c.candidates[0].content.parts) {
            if (part.inlineData?.data) {
              const base64Str = part.inlineData.data;
              const mimeType = part.inlineData.mimeType || "image/png";
              images.push(`data:${mimeType};base64,${base64Str}`);
            }
          }
        }

        // Grounding sources (dedup)
        const groundingChunks: any[] | undefined = c.candidates?.[0]?.groundingMetadata?.groundingChunks as any;
        if (groundingChunks?.length) {
          for (const gc of groundingChunks) {
            if (gc.web?.uri && gc.web?.title && !sourceMap.has(gc.web.uri)) {
              sourceMap.add(gc.web.uri);
              sources.push({ title: gc.web.title, url: gc.web.uri });
            }
          }
        }
      }

      if (!fullText && images.length === 0) {
        fullText = "Data retrieval failed. The void returned nothing.";
      }

      return { text: fullText, sources, images };
    }

    /** =========================
     * B) ANTHROPIC / CLAUDE
     * =========================
     * NOTE: Direct browser calls may still be blocked by CORS depending on your setup.
     * The header below is Anthropic's opt-in for direct browser access.
     */
    if (providerKey === "anthropic") {
      const url = PROVIDER_URLS.anthropic;

      const messages = mapHistoryToOpenAIStyle(history);
      messages.push({ role: "user", content: finalQuery || query });

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: selectedModel.internalModelId,
          // Anthropic REQUIRED field. 8192 is the current high-end max for 3.5 Sonnet/Opus.
          // Setting this ensures we get the "max possible" for current models.
          max_tokens: 30000, 
          messages,
          system: systemInstruction,
          stream: true,
        }),
      });

      if (!res.ok) {
        const err = await res.text().catch(() => "");
        throw new Error(`Anthropic API Error: ${res.status} - ${err}`);
      }
      if (!res.body) throw new Error("No response body from Anthropic.");

      let fullText = "";
      let currentEvent = "";

      for await (const line of sseLines(res.body)) {
        if (!line) continue;

        if (line.startsWith("event:")) {
          currentEvent = line.slice("event:".length).trim();
          continue;
        }

        if (!line.startsWith("data:")) continue;
        const dataStr = line.slice("data:".length).trim();
        if (!dataStr) continue;

        try {
          const evt = JSON.parse(dataStr);

          // Most useful deltas come through this event type
          if (currentEvent === "content_block_delta" && evt.delta?.text) {
            fullText += evt.delta.text;
            onChunk?.(fullText);
          }

          if (currentEvent === "message_stop") break;
        } catch {
          // ignore malformed keepalives
        }
      }

      if (!fullText) fullText = "Data retrieval failed. The void returned nothing.";
      return { text: fullText, sources: [], images: [] };
    }

    /** =========================
     * C) OpenAI-compatible
     * (xAI / OpenAI / Moonshot)
     * ========================= */
    if (providerKey === "xai" || providerKey === "openai" || providerKey === "moonshot") {
      const url = PROVIDER_URLS[providerKey];

      const messages = [
        { role: "system", content: systemInstruction },
        ...mapHistoryToOpenAIStyle(history),
        { role: "user", content: finalQuery || query },
      ];

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel.internalModelId,
          messages,
          stream: true,
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        const err = await res.text().catch(() => "");
        throw new Error(`${selectedModel.provider} API Error: ${res.status} - ${err}`);
      }
      if (!res.body) throw new Error("No response body from provider.");

      let fullText = "";

      for await (const line of sseLines(res.body)) {
        if (!line.startsWith("data:")) continue;

        const dataStr = line.slice("data:".length).trim();
        if (dataStr === "[DONE]") break;
        if (!dataStr) continue;

        try {
          const parsed = JSON.parse(dataStr) as { choices?: Array<{ delta?: { content?: string } }> };
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            onChunk?.(fullText);
          }
        } catch {
          // ignore malformed keepalives
        }
      }

      if (!fullText) fullText = "Data retrieval failed. The void returned nothing.";
      return { text: fullText, sources: [], images: [] };
    }

    throw new Error(`Provider ${selectedModel.provider} not implemented.`);
  } catch (error) {
    console.error("Model Adapter Error:", error);
    throw error;
  }
};