

export interface Source {
  title: string;
  url: string;
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export type FocusMode = 'all' | 'academic' | 'writing' | 'code' | 'social';

export interface Attachment {
  id: string;
  name: string;
  type: string; // MIME type
  data: string; // Base64 string or raw text content depending on type
  isText: boolean; // Helper to distinguish between code/text and binary assets
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  images?: string[]; // Array of base64 data URIs
  timestamp: number;
  isThinking?: boolean;
  isStreaming?: boolean;
  modelUsed?: string;
  focusMode?: FocusMode;
  attachments?: Attachment[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}

export enum AppState {
  IDLE,
  SEARCHING,
  ANSWERING,
  ERROR,
  VOICE_ACTIVE
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  icon: string; 
  description: string;
  internalModelId: string; 
  useThinking?: boolean;
  supportsImageGeneration?: boolean; // Flag for image capability
  systemInstructionPrefix?: string; // To simulate personality
  badge?: string; // e.g. 'max', 'new'
  badgeColor?: string; // Tailwind classes for the badge text/border
}

// Voice Types
export type LiveConfig = {
  model: string;
  systemInstruction: string;
  voiceName: string;
};

export interface ConnectedApp {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  isConnected: boolean;
  lastSynced?: number;
}

export interface UserProfile {
  username: string;
  title?: string; // e.g. "Senior Engineer"
  avatar?: string; // Base64 image string
  email?: string;
  aboutMe: string; // Context for the AI
  customInstructions: string; // How the AI should respond
  themePreference: 'cyber' | 'minimal' | 'light';
  textSize: number; // Percentage (e.g. 100 = 100%)
  allowDataTraining: boolean; // Mock privacy setting
  connectedApps: Record<string, ConnectedApp>;
}