// services/aiService.ts
// GROK (xAI) UPDATED VERSION — preserves the same public API + structure,
// keeps your system-instruction + profile injection logic, keeps streaming + onChunk,
// keeps attachments handling blocks (but adapts them for Grok).
// UPDATED MODEL: grok-4-1-fast-reasoning

import { SYSTEM_INSTRUCTION, getNeuralUplink, getSystemInstructionForFocus } from "../constants";
import { Source, GroundingChunk, AIModel, FocusMode, Attachment, UserProfile } from "../types";

/**
 * NOTE:
 * - This file no longer uses @google/genai. Grok is called via HTTPS to xAI API.
 * - Some Gemini-specific features (googleSearch grounding metadata, image generation inlineData)
 *   are not available in the same way via xAI chat completions, so sources/images remain supported
 *   in the return shape but may stay empty unless you implement your own retrieval/image pipeline.
 */

export interface SearchResponse {
  text: string;
  sources: Source[];
  images?: string[];
}

type XaiChatCompletionChunk = {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices?: Array<{
    index: number;
    delta?: { role?: string; content?: string };
    message?: { role: string; content: string };
    finish_reason?: string | null;
  }>;
};

type XaiChatCompletionResponse = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

const XAI_CHAT_COMPLETIONS_URL = "https://api.x.ai/v1/chat/completions";

// Small helper: safe access to env in Vite
const getEnvKey = (name: string): string | undefined => {
  try {
    // @ts-ignore
    return typeof import.meta !== "undefined" ? import.meta.env?.[name] : undefined;
  } catch {
    return undefined;
  }
};

// SSE parsing helper for xAI streaming
async function* sseLines(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE events are separated by \n\n; but lines can arrive partial.
    // We'll process line-by-line, because OpenAI-style streaming uses "data: {...}\n\n".
    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      yield line.trimEnd();
    }
  }

  if (buffer.length > 0) {
    yield buffer.trimEnd();
  }
}

function mapHistoryToOpenAIStyle(history: { role: string; parts: { text: string }[] }[]) {
  // Your app uses Gemini-ish history shape:
  // role: "user" | "model"
  // Grok expects "user" | "assistant" | "system"
  return history
    .map((h) => {
      const role =
        h.role === "model" ? "assistant" :
        h.role === "user" ? "user" :
        // In case anything else appears, treat as user
        "user";

      const content = (h.parts || [])
        .map((p) => p?.text ?? "")
        .join("");

      return { role, content };
    })
    .filter((m) => m.content?.trim?.().length > 0);
}

export const generateChatTitle = async (
  query: string,
  responseContext: string
): Promise<string> => {
  try {
    // Keep this call site the same; your constants can return whatever you want.
    // We’ll treat getNeuralUplink() as a "key provider" for Grok.
    // Recommended: have getNeuralUplink() return the final key string, or an object with apiKey.
    const uplink: any = getNeuralUplink();

    // Resolve key from uplink OR env fallback (Vite)
    const apiKey =
      uplink?.apiKey ||
      uplink?.key ||
      getEnvKey("VITE_GROK_API_KEY") ||
      // keep your old fallback for dev compatibility if you polyfill process.env
      // @ts-ignore
      (typeof process !== "undefined" ? process.env?.API_KEY : undefined);

    if (!apiKey) throw new Error("Grok API key missing");

    const prompt = `Based on the following interaction, generate a short, concise, and cool 3-5 word title for this chat session. No quotes, no "Title:", just the raw string.
    
    User: ${query.substring(0, 300)}
    AI: ${responseContext.substring(0, 300)}...`;

    const body = {
      // Choose a cheap/fast model for titles (adjust if you prefer)
      model: "grok-4-1-fast-reasoning",
      messages: [
        { role: "system", content: "You generate concise chat titles." },
        { role: "user", content: prompt },
      ],
      max_tokens: 20,
      temperature: 0.7,
      stream: false,
    };

    const res = await fetch(XAI_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`xAI error ${res.status}`);

    const data = (await res.json()) as XaiChatCompletionResponse;
    const title = data.choices?.[0]?.message?.content?.trim();
    return title || query.substring(0, 30);
  } catch (e) {
    return query.substring(0, 30);
  }
};

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
    const uplink: any = getNeuralUplink();

    // Resolve key from uplink OR env fallback (Vite)
    const apiKey =
      uplink?.apiKey ||
      uplink?.key ||
      getEnvKey("VITE_GROK_API_KEY") ||
      // keep your old fallback for dev compatibility if you polyfill process.env
      // @ts-ignore
      (typeof process !== "undefined" ? process.env?.API_KEY : undefined);

    if (!apiKey) {
      throw new Error("Grok API key missing");
    }

    // 1. Prepare Content
    // Preserve your original flow: build "contents" from history + currentParts from attachments + query.
    // For Grok, we transform into OpenAI-style messages:
    const baseMessages = mapHistoryToOpenAIStyle(history);

    // Keep your "currentParts" concept so you don't lose anything.
    const currentParts: any[] = [];

    // Add Attachments with Safety Check (preserved)
    for (const att of attachments) {
      if (att.isText) {
        currentParts.push({
          text: `\n\n--- FILE ATTACHMENT: ${att.name} ---\n${att.data}\n--- END ATTACHMENT ---\n\n`
        });
      } else {
        // Ensure strictly supported types for inlineData to prevent 400 errors (preserved)
        const supportedTypes = [
            "application/pdf",
            "image/png", "image/jpeg", "image/webp", "image/heic", "image/heif",
            "audio/wav", "audio/mp3", "audio/aiff", "audio/aac", "audio/ogg", "audio/flac",
            "video/mp4", "video/mpeg", "video/mov", "video/avi", "video/x-flv", "video/mpg", "video/webm", "video/wmv", "video/3gpp"
        ];
        
        // Grok chat completions (OpenAI-style) do NOT accept Gemini inlineData the same way.
        // We preserve this block and adapt by including a textual placeholder describing the attachment.
        if (supportedTypes.includes(att.type)) {
            currentParts.push({
              text: `\n\n--- BINARY ATTACHMENT (not inline-supported in this Grok adapter): ${att.name} (${att.type}) ---\n` +
                    `The file was provided as base64 (${(att.data?.length ?? 0)} chars). ` +
                    `If you need the model to use this file, route via a server or a multimodal endpoint you control.\n` +
                    `--- END ATTACHMENT ---\n\n`
            });
        } else {
            console.warn(`Skipping attachment ${att.name}: Unsupported MIME type for inlineData: ${att.type}`);
            currentParts.push({
              text: `\n\n--- ATTACHMENT SKIPPED: ${att.name} (${att.type}) unsupported ---\n\n`
            });
        }
      }
    }

    if (query.trim()) {
      currentParts.push({ text: query });
    }

    // Convert currentParts into a single user content string
    const currentUserContent = currentParts
      .map((p) => (typeof p?.text === "string" ? p.text : ""))
      .join("");

    // 2. Prepare System Instruction (preserved + same injection)
    const focusInstruction = getSystemInstructionForFocus(focusMode);
    
    let combinedSystemInstruction = SYSTEM_INSTRUCTION;
    if (selectedModel.systemInstructionPrefix) {
      combinedSystemInstruction = `${selectedModel.systemInstructionPrefix}\n\n${SYSTEM_INSTRUCTION}`;
    }
    
    // INJECT USER PROFILE CONTEXT
    if (userProfile.aboutMe.trim()) {
      combinedSystemInstruction += `\n\nUSER CONTEXT (Who you are talking to):\n${userProfile.aboutMe}`;
    }
    
    if (userProfile.customInstructions.trim()) {
      combinedSystemInstruction += `\n\nUSER PREFERENCES (How to respond):\n${userProfile.customInstructions}`;
    }

    if (focusInstruction) {
      combinedSystemInstruction += `\n\nCURRENT FOCUS MODE: ${focusMode.toUpperCase()}. ${focusInstruction}`;
    }

    // INJECT CONNECTED APPS (preserved)
    const connectedAppNames = userProfile.connectedApps 
      ? Object.values(userProfile.connectedApps)
          .filter(app => app.isConnected)
          .map(app => app.name)
      : [];
        
    if (connectedAppNames.length > 0) {
        combinedSystemInstruction += `\n\nACTIVE DATA INTEGRATIONS: ${connectedAppNames.join(', ')}. 
        You have authorization to access data from these sources if relevant to the query. 
        Since this is a simulated environment, if the user asks about their personal data from these sources, clearly label any fabricated examples as [MOCK DATA] and do not present them as real.`;
    }

    // 3. Configure Capability Adapters (preserved shape)
    // Gemini had tools: [{ googleSearch: {} }] and thinkingConfig/imageConfig.
    // Grok chat completions do not accept these fields directly. We keep "config" but adapt later.
    const config: any = {
      systemInstruction: combinedSystemInstruction,
      tools: [{ googleSearch: {} }], 
    };

    if (selectedModel.useThinking) {
      // Keep the flag. xAI supports reasoning in some models/configs, but not via this exact param.
      config.thinkingConfig = { thinkingBudget: 2048 }; 
    }
    
    if (selectedModel.supportsImageGeneration) {
       config.imageConfig = {
          aspectRatio: "1:1",
          imageSize: "1K"
       };
    }

    let internalModel = selectedModel.internalModelId;

    // --- GROK EXECUTE - STREAMING MODE ---
    // We preserve your streaming behavior:
    // - accumulate fullText
    // - call onChunk(fullText) repeatedly
    // - return { text, sources, images }
    //
    // With Grok streaming (OpenAI-style), we parse SSE "data:" lines.
    const messages = [
      { role: "system", content: combinedSystemInstruction },
      ...baseMessages,
      { role: "user", content: currentUserContent },
    ];

    const requestBody = {
      model: internalModel || "grok-4-1-fast-reasoning",
      messages,
      temperature: 0.7,
      stream: true,
      // You can set max_tokens if you want:
      // max_tokens: 2048,
    };

    const res = await fetch(XAI_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`xAI error ${res.status}: ${errText}`);
    }

    if (!res.body) {
      throw new Error("xAI response has no body (streaming not supported in this environment).");
    }
    
    let fullText = "";
    const images: string[] = [];
    const sources: Source[] = [];
    const sourceMap = new Set<string>();

    // We keep your GroundingChunk logic placeholders,
    // but xAI does not provide Gemini groundingMetadata, so this stays empty by default.
    const consumeChunk = (c: XaiChatCompletionChunk) => {
      const delta = c.choices?.[0]?.delta?.content ?? "";
      
      // Accumulate Text
      if (delta) {
        fullText += delta;
        if (onChunk) {
          onChunk(fullText);
        }
      }

      // Collect Images — not available in this adapter (preserved path)
      // Collect Sources — not available in this adapter (preserved path)
      // If you later add retrieval/tooling, you can populate sources here.
    };

    for await (const line of sseLines(res.body)) {
      // OpenAI-style streams send:
      // data: {...}
      // data: [DONE]
      if (!line) continue;
      if (!line.startsWith("data:")) continue;

      const dataStr = line.slice("data:".length).trim();
      if (dataStr === "[DONE]") break;

      try {
        const parsed = JSON.parse(dataStr) as XaiChatCompletionChunk;
        consumeChunk(parsed);
      } catch {
        // ignore parse errors on keepalive lines
      }
    }
    
    if (!fullText && images.length === 0) {
       fullText = "Data retrieval failed. The void returned nothing.";
    }

    return { text: fullText, sources, images };

  } catch (error) {
    console.error("Model Adapter Error:", error);
    throw error;
  }
};
