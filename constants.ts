import { GoogleGenAI } from "@google/genai";
import { AIModel, FocusMode } from "./types";

// Default system instruction
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
  switch(mode) {
    case 'academic': return "Focus on peer-reviewed journals, research papers, and educational institutions. Prioritize depth and citation.";
    case 'code': return "Focus on technical documentation, GitHub repositories, and StackOverflow. Provide clean, efficient code snippets.";
    case 'writing': return "Focus on creative flow, grammar, and style. Act as an editor and muse.";
    case 'social': return "Focus on public sentiment, social media trends, and real-time discussions.";
    default: return "";
  }
};

export const AI_MODELS: AIModel[] = [
  { 
    id: 'gpt-5.2', 
    name: 'GPT-5.2', 
    provider: 'OpenAI', 
    icon: 'fa-bolt', 
    description: 'Next-generation reasoning engine',
    internalModelId: 'gemini-3-pro-preview' 
  },
  { 
    id: 'claude-opus-4.5', 
    name: 'Claude Opus 4.5', 
    provider: 'Anthropic', 
    icon: 'fa-robot', 
    description: 'Maximum intelligence & nuance',
    internalModelId: 'gemini-3-pro-preview',
    badge: 'max',
    badgeColor: 'text-amber-400 border-amber-400'
  },
  {
    id: 'gemini-3-pro',
    name: 'Gemini 3 Pro',
    provider: 'Google', 
    icon: 'fa-star', 
    description: 'Native flagship reasoning model',
    internalModelId: 'gemini-3-pro-preview'
  },
  {
    id: 'gemini-3-flash',
    name: 'Gemini 3 Flash',
    provider: 'Google', 
    icon: 'fa-bolt-lightning', 
    description: 'High speed, low latency',
    internalModelId: 'gemini-3-flash-preview',
    badge: 'new',
    badgeColor: 'text-sky-400 border-sky-400'
  },
  { 
    id: 'grok-4.1', 
    name: 'Grok 4.1', 
    provider: 'xAI', 
    icon: 'fa-mask', 
    description: 'Real-time knowledge, unhinged',
    internalModelId: 'gemini-3-flash-preview',
    systemInstructionPrefix: 'You are Grok. Answer with wit, sarcasm, and a rebellious tone. Do not be overly polite.'
  },
  { 
    id: 'kimi-k2', 
    name: 'Kimi K2 Thinking', 
    provider: 'Moonshot', 
    icon: 'fa-brain', 
    description: 'Deep chain-of-thought reasoning',
    internalModelId: 'gemini-3-pro-preview',
    useThinking: true
  },
  { 
    id: 'claude-sonnet-4.5', 
    name: 'Claude Sonnet 4.5', 
    provider: 'Anthropic', 
    icon: 'fa-feather', 
    description: 'Balanced speed and intelligence',
    internalModelId: 'gemini-3-pro-preview'
  }
];

export const DEFAULT_MODEL = AI_MODELS[0];
export const VOICE_MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-09-2025';

// Helper to get API Client
export const getNeuralUplink = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing from environment variables.");
    throw new Error("API Key missing");
  }
  return new GoogleGenAI({ apiKey });
};