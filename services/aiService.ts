import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION, getNeuralUplink, getSystemInstructionForFocus } from "../constants";
import { Source, AIModel, FocusMode, Attachment, UserProfile } from "../types";

export interface SearchResponse {
  text: string;
  sources: Source[];
  images?: string[];
}

// --- OPENAI COMPATIBLE TYPES (xAI, Moonshot, OpenAI) ---
type ChatCompletionChunk = {
  id?: string;
  choices?: Array<{
    delta?: { content?: string };
  }>;
};

const PROVIDER_URLS: Record<string, string> = {
    'xAI': "https://api.x.ai/v1/chat/completions",
    'OpenAI': "https://api.openai.com/v1/chat/completions",
    'Moonshot': "https://api.moonshot.cn/v1/chat/completions",
    'Anthropic': "https://api.anthropic.com/v1/messages"
};

// Helper: safe access to env in Vite
const getEnvKey = (name: string): string | undefined => {
  try {
    // @ts-ignore
    return typeof import.meta !== "undefined" ? import.meta.env?.[name] : undefined;
  } catch {
    return undefined;
  }
};

// --- KEY RETRIEVAL HELPER ---
const getApiKeyForProvider = (provider: string, userProfile: UserProfile): string | undefined => {
    // 1. Check User Profile first (Bring Your Own Key)
    const profileKey = userProfile.apiKeys?.[provider.toLowerCase()];
    if (profileKey) return profileKey;

    // 2. Check Environment Variables (Deployment Config)
    switch(provider) {
        case 'Google': return getEnvKey('VITE_GOOGLE_API_KEY') || getEnvKey('API_KEY');
        case 'xAI': return getEnvKey('VITE_GROK_API_KEY');
        case 'OpenAI': return getEnvKey('VITE_OPENAI_API_KEY');
        case 'Anthropic': return getEnvKey('VITE_ANTHROPIC_API_KEY');
        case 'Moonshot': return getEnvKey('VITE_MOONSHOT_API_KEY');
        default: return undefined;
    }
};

// --- SSE HELPER ---
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

// --- FORMATTING HELPERS ---
function mapHistoryToOpenAIStyle(history: { role: string; parts: { text: string }[] }[]) {
  return history
    .map((h) => ({
      role: h.role === "model" ? "assistant" : "user",
      content: h.parts.map(p => p.text || "").join("")
    }))
    .filter(m => m.content.trim().length > 0);
}

// --- TITLE GENERATION ---
export const generateChatTitle = async (query: string, responseContext: string): Promise<string> => {
    // Simple logic: return truncated query to save tokens/calls on title gen for now
    // or implement a lightweight call if desired.
    return query.length > 40 ? query.substring(0, 40) + "..." : query;
};

// --- MAIN SEARCH FUNCTION ---
export const performDeepSearch = async (
  query: string,
  history: { role: string; parts: { text: string }[] }[],
  attachments: Attachment[],
  selectedModel: AIModel,
  userProfile: UserProfile,
  focusMode: FocusMode = "all",
  onChunk?: (text: string) => void
): Promise<SearchResponse> => {
  
  const provider = selectedModel.provider;
  const apiKey = getApiKeyForProvider(provider, userProfile);

  if (!apiKey) {
      throw new Error(`Missing API Key for ${provider}. Please add it in Settings > API Keys.`);
  }

  // 1. Prepare System Instruction
  let systemInstruction = SYSTEM_INSTRUCTION;
  if (selectedModel.systemInstructionPrefix) {
      systemInstruction = `${selectedModel.systemInstructionPrefix}\n\n${systemInstruction}`;
  }
  
  if (userProfile.aboutMe) systemInstruction += `\n\nUSER CONTEXT:\n${userProfile.aboutMe}`;
  if (userProfile.customInstructions) systemInstruction += `\n\nUSER PREFERENCES:\n${userProfile.customInstructions}`;
  
  const focusInst = getSystemInstructionForFocus(focusMode);
  if (focusInst) systemInstruction += `\n\nFOCUS MODE (${focusMode.toUpperCase()}): ${focusInst}`;

  // 2. Prepare Context/Attachments
  const contextParts: string[] = [];
  attachments.forEach(att => {
      if (att.isText) {
          contextParts.push(`\n[FILE: ${att.name}]\n${att.data}\n[END FILE]\n`);
      } else {
          contextParts.push(`\n[BINARY FILE: ${att.name} (${att.type}) - Content Omitted in Text Stream]\n`);
      }
  });
  
  const finalQuery = `${contextParts.join('\n')}\n\n${query}`;

  // --- ROUTING ---
  
  // A. GOOGLE GEMINI
  if (provider === 'Google') {
      const ai = new GoogleGenAI({ apiKey });
      const modelId = selectedModel.internalModelId;
      
      // Map history to Gemini Format
      // Note: We use the existing structure passed in 'history' which is already partially Gemini-shaped
      // but strictly it should be Content objects.
      
      // Construct Request
      const contents = history.map(h => ({
          role: h.role,
          parts: h.parts
      }));
      // Add current message
      contents.push({ role: 'user', parts: [{ text: finalQuery }] });

      const config: any = {
          systemInstruction,
          tools: [{ googleSearch: {} }] // Only for Gemini
      };
      
      if (selectedModel.useThinking) config.thinkingConfig = { thinkingBudget: 2048 };
      
      const responseStream = await ai.models.generateContentStream({
          model: modelId,
          contents,
          config
      });

      let fullText = "";
      const sources: Source[] = [];
      
      for await (const chunk of responseStream) {
          const text = chunk.text;
          if (text) {
              fullText += text;
              onChunk?.(fullText);
          }
          
          // Collect Grounding
          if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
             chunk.candidates[0].groundingMetadata.groundingChunks.forEach((c: any) => {
                 if (c.web?.uri && c.web?.title) {
                     sources.push({ title: c.web.title, url: c.web.uri });
                 }
             });
          }
      }
      return { text: fullText, sources, images: [] };
  }

  // B. ANTHROPIC (CLAUDE)
  if (provider === 'Anthropic') {
      // NOTE: Direct browser calls to Anthropic usually fail CORS unless proxied.
      // We implement standard fetch here.
      
      const messages = mapHistoryToOpenAIStyle(history);
      messages.push({ role: 'user', content: finalQuery });

      const res = await fetch(PROVIDER_URLS.Anthropic, {
          method: 'POST',
          headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
              'dangerously-allow-browser': 'true' // Client-side specific header for Anthropic
          },
          body: JSON.stringify({
              model: selectedModel.internalModelId,
              max_tokens: 4096,
              messages: messages,
              system: systemInstruction,
              stream: true
          })
      });

      if (!res.ok) throw new Error(`Anthropic API Error: ${res.status}`);
      if (!res.body) throw new Error("No response body");

      let fullText = "";
      for await (const line of sseLines(res.body)) {
          if (!line.startsWith("data:")) continue;
          const dataStr = line.slice(5).trim();
          if (!dataStr || dataStr === '[DONE]') continue;
          
          try {
              const event = JSON.parse(dataStr);
              if (event.type === 'content_block_delta' && event.delta?.text) {
                  fullText += event.delta.text;
                  onChunk?.(fullText);
              }
          } catch(e) {}
      }
      return { text: fullText, sources: [] };
  }

  // C. OPENAI / xAI / MOONSHOT (COMPATIBLE)
  if (['OpenAI', 'xAI', 'Moonshot'].includes(provider)) {
      const url = PROVIDER_URLS[provider];
      const messages = [
          { role: 'system', content: systemInstruction },
          ...mapHistoryToOpenAIStyle(history),
          { role: 'user', content: finalQuery }
      ];

      const res = await fetch(url, {
          method: 'POST',
          headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({
              model: selectedModel.internalModelId,
              messages,
              stream: true,
              temperature: 0.7
          })
      });

      if (!res.ok) {
          const err = await res.text();
          throw new Error(`${provider} API Error: ${res.status} - ${err}`);
      }
      if (!res.body) throw new Error("No response body");

      let fullText = "";
      for await (const line of sseLines(res.body)) {
          if (!line.startsWith("data:")) continue;
          const dataStr = line.slice(5).trim();
          if (dataStr === '[DONE]') break;
          
          try {
              const parsed = JSON.parse(dataStr) as ChatCompletionChunk;
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                  fullText += content;
                  onChunk?.(fullText);
              }
          } catch (e) {}
      }
      return { text: fullText, sources: [] };
  }

  throw new Error(`Provider ${provider} not implemented.`);
};