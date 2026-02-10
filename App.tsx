import React, { useState, useRef, useEffect } from 'react';
import { Message, AppState, AIModel, FocusMode, ChatSession, Attachment, UserProfile, Quote } from './types';
import { DEFAULT_MODEL } from './constants';
import { performDeepSearch, generateChatTitle } from './services/aiService';
import { LiveService } from './services/liveService';
import { getSessions, saveSession, deleteSessionById, getUserProfile, saveUserProfile, clearAllSessions } from './utils/storage';
import SearchBar from './components/SearchBar';
import MessageItem from './components/MessageItem';
import VoiceOverlay from './components/VoiceOverlay';
import UserProfileModal from './components/UserProfileModal';
import TextSelectionMenu from './components/TextSelectionMenu';

// --- Components ---

const SidebarItem = ({ icon, label, onClick, active, collapsed }: { icon: string, label: string, onClick: () => void, active?: boolean, collapsed?: boolean }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group w-full
      ${active ? 'bg-surface_highlight text-primary font-medium' : 'text-secondary hover:text-primary hover:bg-surface_highlight/50'}
      ${collapsed ? 'justify-center' : ''}
    `}
    title={collapsed ? label : undefined}
  >
    <i className={`fa-solid ${icon} text-lg w-6 text-center transition-colors ${active ? 'text-primary' : 'text-secondary group-hover:text-primary'}`}></i>
    {!collapsed && <span className="text-sm truncate">{label}</span>}
  </button>
);

const App: React.FC = () => {
  // State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [selectedModel, setSelectedModel] = useState<AIModel>(DEFAULT_MODEL);
  const [voiceAmplitude, setVoiceAmplitude] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile>(getUserProfile());
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Desktop collapse
  
  // Quote State
  const [quotes, setQuotes] = useState<Quote[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const liveServiceRef = useRef<LiveService | null>(null);

  // Load history
  useEffect(() => {
    setSessions(getSessions());
  }, []);

  // Theme Application
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('cyber', 'minimal', 'light', 'dark');
    
    // Default base is dark in Tailwind config, but we control via classes
    if (userProfile.themePreference === 'light') {
        root.classList.remove('dark');
        root.classList.add('light');
    } else {
        root.classList.add('dark');
        if (userProfile.themePreference === 'cyber') root.classList.add('cyber');
        if (userProfile.themePreference === 'minimal') root.classList.add('minimal');
    }
  }, [userProfile.themePreference]);

  // Scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [messages.length, appState]);

  // Session Management
  const persistSession = (msgs: Message[], sessId: string | null, title?: string) => {
    if (!sessId || msgs.length === 0) return;
    const currentSessions = getSessions();
    const existingSession = currentSessions.find(s => s.id === sessId);
    const sessionTitle = title || existingSession?.title || "New Search";
    const sessionToSave: ChatSession = { id: sessId, title: sessionTitle, messages: msgs };
    const updatedSessions = saveSession(sessionToSave);
    setSessions(updatedSessions);
  };

  const handleQuote = (text: string) => {
    const newQuote: Quote = {
      id: Math.random().toString(),
      text: text.substring(0, 300) + (text.length > 300 ? '...' : '') // Truncate for UI, potentially keep full for logic if needed
    };
    setQuotes(prev => [...prev, newQuote]);
  };

  const handleSearch = async (query: string, focusMode: FocusMode, attachments: Attachment[], messageQuotes: Quote[] = []) => {
    let activeSessionId = currentSessionId;
    let isNewSession = false;

    if (!activeSessionId) {
      activeSessionId = Date.now().toString();
      setCurrentSessionId(activeSessionId);
      isNewSession = true;
    }

    // Construct the actual query context including quotes
    let finalQuery = query;
    if (messageQuotes.length > 0) {
       const quoteContext = messageQuotes.map(q => `> ${q.text}`).join('\n');
       finalQuery = `${quoteContext}\n\n${query}`;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: Date.now(),
      focusMode,
      attachments,
      quotes: messageQuotes
    };

    const initialMessages = [...messages, userMsg];
    setMessages(initialMessages);
    setAppState(AppState.SEARCHING);
    setQuotes([]); // Clear quotes after sending
    
    // Optimistic Save
    const title = query.length > 30 ? query.substring(0, 30) + '...' : query;
    persistSession(initialMessages, activeSessionId, isNewSession ? title : undefined);

    const aiMsgId = (Date.now() + 1).toString();
    const placeholderAiMsg: Message = {
      id: aiMsgId,
      role: 'assistant',
      content: '', 
      timestamp: Date.now(),
      modelUsed: selectedModel.name,
      isStreaming: true,
      isThinking: selectedModel.useThinking 
    };

    setMessages(prev => [...prev, placeholderAiMsg]);

    try {
      const historyContext = initialMessages.map(m => {
        // We need to bake quotes into history context if they exist
        let content = m.content;
        if (m.quotes && m.quotes.length > 0) {
            content = m.quotes.map(q => `> ${q.text}`).join('\n') + '\n\n' + content;
        }
        return {
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: content }] 
        };
      });

      // We pass finalQuery here because performDeepSearch expects the raw prompt text for the current turn
      const result = await performDeepSearch(
        finalQuery, 
        historyContext.slice(0, -1), // Exclude current message from history as it's passed as query
        attachments, 
        selectedModel, 
        userProfile, 
        focusMode,
        (partialText) => {
           setMessages(currentMsgs => {
             const newMsgs = [...currentMsgs];
             const msgIndex = newMsgs.findIndex(m => m.id === aiMsgId);
             if (msgIndex !== -1) {
               newMsgs[msgIndex] = {
                 ...newMsgs[msgIndex],
                 content: partialText,
                 isThinking: false, 
                 isStreaming: true
               };
             }
             return newMsgs;
           });
           // Auto-scroll during stream
           if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'auto' });
        }
      );

      setMessages(currentMsgs => {
        const newMsgs = [...currentMsgs];
        const msgIndex = newMsgs.findIndex(m => m.id === aiMsgId);
        if (msgIndex !== -1) {
           newMsgs[msgIndex] = {
             ...newMsgs[msgIndex],
             content: result.text,
             sources: result.sources,
             images: result.images,
             isStreaming: false,
             isThinking: false
           };
           
           if (isNewSession) {
             generateChatTitle(query, result.text).then(smartTitle => {
                persistSession(newMsgs, activeSessionId!, smartTitle);
             });
           } else {
             persistSession(newMsgs, activeSessionId!);
           }
        }
        return newMsgs;
      });

      setAppState(AppState.IDLE);

    } catch (error: any) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `**Connection Error**: ${error.message || "Failed to reach the neural core."} \n\nPlease check your API Key in Settings.`,
        timestamp: Date.now()
      };
      setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, isStreaming: false, isThinking: false } : m).concat(errorMsg));
      setAppState(AppState.ERROR);
    }
  };

  const handleRegenerate = (id: string) => {
      // Basic regen logic reuse
      const msgIndex = messages.findIndex(m => m.id === id);
      if (msgIndex < 0) return;
      const lastUserMsg = messages.slice(0, msgIndex).reverse().find(m => m.role === 'user');
      if (lastUserMsg) {
          // Truncate and re-search
          const truncated = messages.slice(0, messages.indexOf(lastUserMsg));
          setMessages(truncated);
          handleSearch(lastUserMsg.content, lastUserMsg.focusMode || 'all', lastUserMsg.attachments || [], lastUserMsg.quotes || []);
      }
  };

  const startVoiceMode = async () => {
    setAppState(AppState.VOICE_ACTIVE);
    liveServiceRef.current = new LiveService({
      onAudioData: (amp) => setVoiceAmplitude(amp),
      onClose: () => {
        setAppState(AppState.IDLE);
        setVoiceAmplitude(0);
      }
    });
    await liveServiceRef.current.connect();
  };

  const handleReset = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setAppState(AppState.IDLE);
    setSidebarOpen(false);
    setQuotes([]);
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = deleteSessionById(id);
    setSessions(updated);
    if (id === currentSessionId) handleReset();
  };

  return (
    <div className="flex h-screen bg-background text-primary overflow-hidden font-sans">
      <TextSelectionMenu onQuote={handleQuote} />

      {/* --- SIDEBAR (Desktop) --- */}
      <div className={`hidden md:flex flex-col border-r border-border bg-background transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
         {/* Header */}
         <div className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={handleReset}>
                <div className="w-8 h-8 flex items-center justify-center bg-primary text-background rounded-lg">
                    <i className="fa-solid fa-infinity text-sm"></i>
                </div>
                {!isSidebarCollapsed && <span className="font-display font-bold text-xl tracking-tight">Hyperion</span>}
            </div>
            <button 
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
                className="text-secondary hover:text-primary transition-colors"
            >
                <i className={`fa-solid ${isSidebarCollapsed ? 'fa-angles-right' : 'fa-angles-left'}`}></i>
            </button>
         </div>

         {/* Nav Items - Removed Library */}
         <div className="px-3 space-y-1">
            <SidebarItem 
                icon="fa-plus" 
                label="New Search" 
                onClick={handleReset} 
                collapsed={isSidebarCollapsed}
            />
            <SidebarItem 
                icon="fa-magnifying-glass" 
                label="Deep Search" 
                onClick={() => {}} 
                active={true} 
                collapsed={isSidebarCollapsed}
            />
         </div>

         {/* History Section */}
         <div className="flex-1 overflow-y-auto mt-6 px-3 custom-scrollbar">
            {!isSidebarCollapsed && sessions.length > 0 && (
                <>
                    <div className="text-xs font-bold text-secondary uppercase tracking-wider mb-3 px-2">History</div>
                    <div className="space-y-0.5">
                        {sessions.map(s => (
                            <div 
                                key={s.id}
                                onClick={() => { setCurrentSessionId(s.id); setMessages(s.messages); }}
                                className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer text-sm transition-colors ${currentSessionId === s.id ? 'bg-surface_highlight text-primary' : 'text-secondary hover:bg-surface_highlight/50 hover:text-primary'}`}
                            >
                                <span className="truncate flex-1">{s.title}</span>
                                <button onClick={(e) => handleDeleteSession(e, s.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400">
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            )}
         </div>

         {/* User Footer */}
         <div className="p-4 border-t border-border">
             <button 
                onClick={() => setIsProfileOpen(true)}
                className={`flex items-center gap-3 w-full p-2 rounded-xl hover:bg-surface_highlight transition-colors ${isSidebarCollapsed ? 'justify-center' : ''}`}
             >
                 {userProfile.avatar ? (
                     <img src={userProfile.avatar} className="w-8 h-8 rounded-full object-cover border border-border" alt="Profile" />
                 ) : (
                     <div className="w-8 h-8 rounded-full bg-surface_highlight border border-border flex items-center justify-center text-sm font-bold text-primary">
                         {userProfile.username.charAt(0)}
                     </div>
                 )}
                 {!isSidebarCollapsed && (
                     <div className="flex flex-col items-start min-w-0">
                         <span className="text-sm font-medium truncate w-full text-left text-primary">{userProfile.username}</span>
                         <span className="text-xs text-secondary">Settings</span>
                     </div>
                 )}
             </button>
         </div>
      </div>

      {/* --- MOBILE SIDEBAR DRAWER --- */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}></div>
            <div className="relative w-72 bg-surface border-r border-border h-full flex flex-col p-4 animate-in slide-in-from-left duration-200">
                 <div className="flex items-center justify-between mb-8">
                     <span className="font-display font-bold text-xl text-primary">Hyperion</span>
                     <button onClick={() => setSidebarOpen(false)} className="w-8 h-8 bg-surface_highlight rounded-full flex items-center justify-center text-primary">
                         <i className="fa-solid fa-xmark"></i>
                     </button>
                 </div>
                 <button onClick={handleReset} className="flex items-center gap-3 p-3 bg-primary text-background rounded-xl font-medium mb-6">
                     <i className="fa-solid fa-plus"></i> New Search
                 </button>
                 <div className="flex-1 overflow-y-auto">
                     <div className="text-xs text-secondary font-bold uppercase mb-2">Recent</div>
                     {sessions.map(s => (
                         <div key={s.id} onClick={() => {setCurrentSessionId(s.id); setMessages(s.messages); setSidebarOpen(false);}} className="p-3 text-secondary border-b border-border/50 truncate">
                             {s.title}
                         </div>
                     ))}
                 </div>
                 <div className="mt-auto pt-4 border-t border-border">
                     <button onClick={() => {setIsProfileOpen(true); setSidebarOpen(false);}} className="flex items-center gap-3 text-secondary">
                         <i className="fa-solid fa-gear"></i> Settings
                     </button>
                 </div>
            </div>
        </div>
      )}

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 flex flex-col relative h-full bg-background transition-colors duration-300">
         
         {/* Mobile Header */}
         <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-20">
             <button onClick={() => setSidebarOpen(true)} className="text-secondary hover:text-primary">
                 <i className="fa-solid fa-bars text-lg"></i>
             </button>
             <span className="font-display font-bold text-primary">Hyperion</span>
             <button onClick={() => setIsProfileOpen(true)} className="w-8 h-8 rounded-full bg-surface_highlight flex items-center justify-center">
                 {userProfile.avatar ? <img src={userProfile.avatar} className="w-full h-full rounded-full" /> : <i className="fa-solid fa-user text-xs text-primary"></i>}
             </button>
         </div>

         {messages.length === 0 ? (
             // --- HOME VIEW ---
             <div className="flex-1 flex flex-col items-center justify-center p-4 animate-fade-in">
                 <div className="w-full max-w-2xl flex flex-col items-center">
                     <div className="mb-10 text-center">
                         <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight mb-3 text-primary">Hyperion Omni</h1>
                         <p className="text-secondary text-lg">What do you want to know?</p>
                     </div>
                     
                     <div className="w-full">
                         <SearchBar 
                             onSearch={handleSearch}
                             isLoading={appState === AppState.SEARCHING}
                             selectedModel={selectedModel}
                             onModelSelect={setSelectedModel}
                             onVoiceStart={startVoiceMode}
                             variant="home"
                             quotes={quotes}
                             onRemoveQuote={(id) => setQuotes(prev => prev.filter(q => q.id !== id))}
                         />
                     </div>

                     {/* Quick Actions / Suggestions */}
                     <div className="flex flex-wrap justify-center gap-3 mt-8">
                         <button onClick={() => handleSearch("Analyze the latest tech trends in 2025", "all", [])} className="px-4 py-2 rounded-full border border-border bg-surface hover:bg-surface_highlight text-secondary hover:text-primary text-sm transition-colors flex items-center gap-2">
                             <i className="fa-solid fa-chart-line text-accent"></i> Tech Trends
                         </button>
                         <button onClick={() => handleSearch("Generate a futuristic cityscape wallpaper", "all", [])} className="px-4 py-2 rounded-full border border-border bg-surface hover:bg-surface_highlight text-secondary hover:text-primary text-sm transition-colors flex items-center gap-2">
                             <i className="fa-solid fa-image text-purple-400"></i> Create Image
                         </button>
                         <button onClick={() => handleSearch("Explain quantum entanglement simply", "academic", [])} className="px-4 py-2 rounded-full border border-border bg-surface hover:bg-surface_highlight text-secondary hover:text-primary text-sm transition-colors flex items-center gap-2">
                             <i className="fa-solid fa-atom text-green-400"></i> Learn Science
                         </button>
                     </div>
                 </div>
             </div>
         ) : (
             // --- CHAT VIEW ---
             <div className="flex-1 flex flex-col h-full overflow-hidden">
                 <div className="flex-1 overflow-y-auto px-4 md:px-0 py-6 custom-scrollbar scroll-smooth">
                     <div className="max-w-3xl mx-auto pb-32">
                         {messages.map(msg => (
                             <MessageItem 
                                 key={msg.id} 
                                 message={msg} 
                                 onRegenerate={handleRegenerate}
                             />
                         ))}
                         <div ref={bottomRef} />
                     </div>
                 </div>
                 
                 {/* Fixed Input Area */}
                 <div className="bg-background/80 backdrop-blur-md border-t border-border p-4 w-full z-10 transition-colors duration-300">
                     <div className="max-w-3xl mx-auto">
                         <SearchBar 
                             onSearch={handleSearch}
                             isLoading={appState === AppState.SEARCHING}
                             selectedModel={selectedModel}
                             onModelSelect={setSelectedModel}
                             onVoiceStart={startVoiceMode}
                             variant="chat"
                             quotes={quotes}
                             onRemoveQuote={(id) => setQuotes(prev => prev.filter(q => q.id !== id))}
                         />
                     </div>
                 </div>
             </div>
         )}
         
         <VoiceOverlay 
             isActive={appState === AppState.VOICE_ACTIVE} 
             onClose={() => { liveServiceRef.current?.disconnect(); setAppState(AppState.IDLE); }}
             amplitude={voiceAmplitude}
         />

         <UserProfileModal 
             isOpen={isProfileOpen} 
             onClose={() => setIsProfileOpen(false)}
             profile={userProfile}
             onSave={(p) => { saveUserProfile(p); setUserProfile(p); }}
             onClearData={() => { clearAllSessions(); handleReset(); }}
         />

      </div>
    </div>
  );
};

export default App;