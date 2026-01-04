import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { SYSTEM_INSTRUCTION, getNeuralUplink, getSystemInstructionForFocus } from "../constants";
import { Source, GroundingChunk, AIModel, FocusMode, Attachment, UserProfile } from "../types";

export interface SearchResponse {
  text: string;
  sources: Source[];
  images?: string[];
}

export const generateChatTitle = async (
  query: string,
  responseContext: string
): Promise<string> => {
  try {
    const ai = getNeuralUplink();
    const prompt = `Based on the following interaction, generate a short, concise, and cool 3-5 word title for this chat session. No quotes, no "Title:", just the raw string.
    
    User: ${query.substring(0, 300)}
    AI: ${responseContext.substring(0, 300)}...`;
    
    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        maxOutputTokens: 20,
        temperature: 0.7 
      }
    });
    
    return result.text?.trim() || query.substring(0, 30);
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
  focusMode: FocusMode = 'all',
  onChunk?: (text: string) => void
): Promise<SearchResponse> => {
  try {
    const ai = getNeuralUplink();

    // 1. Prepare Content
    const contents: any[] = history.map(h => ({ role: h.role, parts: h.parts }));
    const currentParts: any[] = [];

    // Add Attachments with Safety Check
    for (const att of attachments) {
      if (att.isText) {
        currentParts.push({
          text: `\n\n--- FILE ATTACHMENT: ${att.name} ---\n${att.data}\n--- END ATTACHMENT ---\n\n`
        });
      } else {
        // Ensure strictly supported types for inlineData to prevent 400 errors
        const supportedTypes = [
            'application/pdf',
            'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif',
            'audio/wav', 'audio/mp3', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/flac',
            'video/mp4', 'video/mpeg', 'video/mov', 'video/avi', 'video/x-flv', 'video/mpg', 'video/webm', 'video/wmv', 'video/3gpp'
        ];
        
        if (supportedTypes.includes(att.type)) {
            currentParts.push({
              inlineData: {
                mimeType: att.type,
                data: att.data // This is base64 string
              }
            });
        } else {
            console.warn(`Skipping attachment ${att.name}: Unsupported MIME type for inlineData: ${att.type}`);
        }
      }
    }

    if (query.trim()) {
      currentParts.push({ text: query });
    }

    contents.push({ role: 'user', parts: currentParts });

    // 2. Prepare System Instruction
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

    // INJECT CONNECTED APPS
    const connectedAppNames = userProfile.connectedApps 
      ? Object.values(userProfile.connectedApps)
          .filter(app => app.isConnected)
          .map(app => app.name)
      : [];
        
    if (connectedAppNames.length > 0) {
        combinedSystemInstruction += `\n\nACTIVE DATA INTEGRATIONS: ${connectedAppNames.join(', ')}. 
        You have authorization to access data from these sources if relevant to the query. 
        Since this is a simulated environment, please hallucinate plausible but realistic data from these sources if the user asks about their personal data, prefixed with [MOCK DATA].`;
    }

    // 3. Configure Capability Adapters
    const config: any = {
      systemInstruction: combinedSystemInstruction,
      tools: [{ googleSearch: {} }], 
    };

    if (selectedModel.useThinking) {
      // Set thinkingBudget. maxOutputTokens is generally not needed unless stricter limits desired.
      config.thinkingConfig = { thinkingBudget: 2048 }; 
    }
    
    if (selectedModel.supportsImageGeneration) {
       config.imageConfig = {
          aspectRatio: "1:1",
          imageSize: "1K"
       };
    }

    let internalModel = selectedModel.internalModelId;

    // EXECUTE - STREAMING MODE
    const responseStream = await ai.models.generateContentStream({
      model: internalModel, 
      contents: contents,
      config: config,
    });
    
    let fullText = "";
    const images: string[] = [];
    const sources: Source[] = [];
    const sourceMap = new Set<string>();

    for await (const chunk of responseStream) {
      const c = chunk as GenerateContentResponse;
      
      // Accumulate Text
      if (c.text) {
        fullText += c.text;
        if (onChunk) {
          onChunk(fullText);
        }
      }

      // Collect Images
      if (c.candidates?.[0]?.content?.parts) {
        for (const part of c.candidates[0].content.parts) {
          if (part.inlineData) {
             const base64Str = part.inlineData.data;
             const mimeType = part.inlineData.mimeType || 'image/png';
             images.push(`data:${mimeType};base64,${base64Str}`);
          }
        }
      }

      // Collect Sources from Grounding Metadata
      const groundingChunks = c.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;
      if (groundingChunks) {
        groundingChunks.forEach((chunk) => {
          if (chunk.web?.uri && chunk.web?.title) {
            if (!sourceMap.has(chunk.web.uri)) {
              sourceMap.add(chunk.web.uri);
              sources.push({
                title: chunk.web.title,
                url: chunk.web.uri
              });
            }
          }
        });
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