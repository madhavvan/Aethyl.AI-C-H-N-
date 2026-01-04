
import { ChatSession, UserProfile, ConnectedApp } from '../types';

const STORAGE_KEY = 'aether_sessions_v1';
const PROFILE_KEY = 'aether_user_profile_v1';

// --- SESSIONS ---

export const getSessions = (): ChatSession[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load sessions", e);
    return [];
  }
};

export const saveSession = (session: ChatSession): ChatSession[] => {
  if (typeof window === 'undefined') return [];
  
  // 1. Get current sessions
  let sessions = getSessions();
  const index = sessions.findIndex(s => s.id === session.id);

  // 2. Update or Insert
  if (index >= 0) {
    sessions[index] = session;
  } else {
    sessions.unshift(session);
  }

  // 3. Try to save with LRU Eviction Strategy
  while (true) {
    try {
      const serialized = JSON.stringify(sessions);
      localStorage.setItem(STORAGE_KEY, serialized);
      return sessions;
    } catch (e: any) {
      // Check for Quota Exceeded Errors
      if (
        e.name === 'QuotaExceededError' || 
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        e.code === 22 || 
        e.code === 1014
      ) {
        if (sessions.length > 1) {
          // Remove the oldest session (last element) to free space
          sessions.pop();
          console.warn("Storage quota exceeded. Removed oldest session to make space.");
          // Loop continues and tries to save again
        } else {
          // Edge case: Only 1 session exists but it's too big.
          // We must stop to avoid infinite loop.
          console.error("Storage full. Single session too large to persist.");
          // Return the sessions in memory (React state will still work, just not persisted)
          return sessions;
        }
      } else {
        console.error("Failed to save session (Unknown Error)", e);
        return sessions;
      }
    }
  }
};

export const deleteSessionById = (sessionId: string): ChatSession[] => {
  if (typeof window === 'undefined') return [];
  try {
    const sessions = getSessions().filter(s => s.id !== sessionId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    return sessions;
  } catch (e) {
    console.error("Failed to delete session", e);
    return [];
  }
};

export const clearAllSessions = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
};

// --- USER PROFILE ---

const DEFAULT_APPS: Record<string, ConnectedApp> = {
  'google': { id: 'google', name: 'Google Workspace', icon: 'fa-google', color: 'text-red-500', description: 'Access to Drive, Docs, and Gmail context.', isConnected: true, lastSynced: Date.now() },
  'github': { id: 'github', name: 'GitHub', icon: 'fa-github', color: 'text-white', description: 'Read access to public and private repositories.', isConnected: false },
  'twitter': { id: 'twitter', name: 'X / Twitter', icon: 'fa-x-twitter', color: 'text-white', description: 'Analyze bookmarks and posted content.', isConnected: false },
  'notion': { id: 'notion', name: 'Notion', icon: 'fa-n', color: 'text-white', description: 'Search across workspace pages and databases.', isConnected: false },
  'slack': { id: 'slack', name: 'Slack', icon: 'fa-slack', color: 'text-purple-400', description: 'Context from starred channels and DMs.', isConnected: false }
};

const DEFAULT_PROFILE: UserProfile = {
  username: 'Traveler',
  title: 'Digital Nomad',
  email: 'traveler@aether.net',
  aboutMe: '',
  customInstructions: '',
  themePreference: 'cyber',
  textSize: 100,
  allowDataTraining: false,
  connectedApps: DEFAULT_APPS
};

export const getUserProfile = (): UserProfile => {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    const stored = localStorage.getItem(PROFILE_KEY);
    if (!stored) return DEFAULT_PROFILE;
    
    const parsed = JSON.parse(stored);
    return { 
        ...DEFAULT_PROFILE, 
        ...parsed,
        connectedApps: { ...DEFAULT_PROFILE.connectedApps, ...(parsed.connectedApps || {}) }
    };
  } catch (e) {
    return DEFAULT_PROFILE;
  }
};

export const saveUserProfile = (profile: UserProfile): UserProfile => {
  if (typeof window === 'undefined') return profile;
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    return profile;
  } catch (e) {
    console.error("Failed to save profile", e);
    return profile;
  }
};
