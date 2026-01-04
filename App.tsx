import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Message, AppState, AIModel, FocusMode, ChatSession, Attachment, UserProfile } from './types';
import { AI_MODELS, DEFAULT_MODEL } from './constants';
import { performDeepSearch, generateChatTitle } from './services/aiService';
import { LiveService } from './services/liveService';
import { getSessions, saveSession, deleteSessionById, getUserProfile, saveUserProfile, clearAllSessions } from './utils/storage';
import SearchBar from './components/SearchBar';
import MessageItem from './components/MessageItem';
import VoiceOverlay from './components/VoiceOverlay';
import ThinkingIndicator from './components/ThinkingIndicator';
import UserProfileModal from './components/UserProfileModal';

const LandingPage = ({ onConnect, isLight }: { onConnect: () => void, isLight: boolean }) => (
  <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
    <div className={`max-w-md w-full p-8 rounded-2xl backdrop-blur-xl border flex flex-col items-center text-center animate-in zoom-in-95 duration-500
      ${isLight ? 'bg-white/90 border-slate-200 shadow-2xl' : 'bg-slate-900/90 border-aether-accent/20 shadow-[0_0_50px_rgba(0,240,255,0.1)]'}`}
    >
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-2xl
        ${isLight ? 'bg-blue-600 text-white' : 'bg-aether-accent text-black shadow-[0_0_20px_rgba(0,240,255,0.4)]'}`}
      >
        <i className="fa-solid fa-infinity"></i>
      </div>
      
      <h1 className={`text-3xl font-display font-bold mb-2 ${isLight ? 'text-slate-800' : 'text-white'}`}>
        HYPERION_OMNI
      </h1>
      <p className={`mb-8 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
        Secure uplink required to access the neural knowledge network. Please authenticate with a valid API key.
      </p>

      <button
        onClick={onConnect}
        className={`w-full py-3.5 rounded-xl font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 group
          ${isLight 
            ? 'bg-slate-900 text-white hover:bg-slate-800 hover:scale-[1.02] shadow-lg' 
            : 'bg-white text-black hover:bg-aether-accent hover:scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_20px_rgba(0,240,255,0.4)]'
          }`}
      >
        <span>INITIALIZE UPLINK</span>
        <i className="fa-solid fa-key group-hover:rotate-12 transition-transform"></i>
      </button>

      <div className={`mt-6 text-[10px] uppercase tracking-widest opacity-50 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
        <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="hover:underline">
           Requires Paid Tier Project
        </a>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [selectedModel, setSelectedModel] = useState<AIModel>(DEFAULT_MODEL);
  const [voiceAmplitude, setVoiceAmplitude] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile>(getUserProfile());
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [apiKeyReady, setApiKeyReady] = useState(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const liveServiceRef = useRef<LiveService | null>(null);

  const isMinimal = userProfile.themePreference === 'minimal';
  const isLight = userProfile.themePreference === 'light';

  // Check for API Key on mount
  useEffect(() => {
    const checkKey = async () => {
      setIsCheckingKey(true);
      try {
        // @ts-ignore
        if (window.aistudio && window.aistudio.hasSelectedApiKey) {
          // @ts-ignore
          const hasKey = await window.aistudio.hasSelectedApiKey();
          setApiKeyReady(hasKey);
        } else {
          // Fallback for non-aistudio environments (dev)
          setApiKeyReady(!!import.meta.env.VITE_GROK_API_KEY);
        }
      } catch (e) {
        console.error("Key check failed", e);
        setApiKeyReady(false);
      } finally {
        setIsCheckingKey(false);
      }
    };
    checkKey();
  }, []);

  const handleConnectKey = async () => {
      try {
          // @ts-ignore
          if (window.aistudio && window.aistudio.openSelectKey) {
              // @ts-ignore
              await window.aistudio.openSelectKey();
              // Race condition mitigation: Assume success immediately.
              setApiKeyReady(true);
          } else {
             alert("Auth provider not available in this environment.");
          }
      } catch (e) {
          console.error("Auth failed", e);
      }
  };

  // Generate particles only if in cyber mode
  const particles = useMemo(() => {
    if (isMinimal || isLight) return [];
    return Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      opacity: Math.random() * 0.5,
      size: Math.random() > 0.8 ? 'h-1 w-1' : 'h-0.5 w-0.5',
      color: Math.random() > 0.5 ? 'bg-white' : (Math.random() > 0.5 ? 'bg-aether-accent' : 'bg-purple-400')
    }));
  }, [isMinimal, isLight]);

  // Load history on mount
  useEffect(() => {
    const loadedSessions = getSessions();
    setSessions(loadedSessions);
  }, []);

  const scrollToBottom = () => {
    if (messages.length > 0) {
       setTimeout(() => {
         bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
       }, 50);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, appState]);

  const persistSession = (msgs: Message[], sessId: string | null, title?: string) => {
    if (!sessId || msgs.length === 0) return;
    
    const currentSessions = getSessions();
    const existingSession = currentSessions.find(s => s.id === sessId);
    
    const sessionTitle = title || existingSession?.title || "New Session";

    const sessionToSave: ChatSession = {
      id: sessId,
      title: sessionTitle,
      messages: msgs
    };

    const updatedSessions = saveSession(sessionToSave);
    setSessions(updatedSessions);
  };

  const handleSearch = async (query: string, focusMode: FocusMode, attachments: Attachment[]) => {
    if (!apiKeyReady) {
        handleConnectKey();
        return;
    }

    let activeSessionId = currentSessionId;
    let isNewSession = false;

    if (!activeSessionId) {
      activeSessionId = Date.now().toString();
      setCurrentSessionId(activeSessionId);
      isNewSession = true;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: Date.now(),
      focusMode: focusMode,
      attachments: attachments
    };

    const initialMessages = [...messages, userMsg];
    setMessages(initialMessages);
    setAppState(AppState.SEARCHING);
    
    if (isNewSession) {
      const title = query.length > 35 ? query.substring(0, 35) + '...' : (query || "New Search");
      persistSession(initialMessages, activeSessionId, title);
    } else {
      persistSession(initialMessages, activeSessionId);
    }

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
      const historyContext = initialMessages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }] 
      }));

      const result = await performDeepSearch(
        query, 
        historyContext, 
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
           scrollToBottom();
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
               if (smartTitle) {
                  persistSession(newMsgs, activeSessionId!, smartTitle);
               }
             });
           }
           
           persistSession(newMsgs, activeSessionId!);
        }
        return newMsgs;
      });

      setAppState(AppState.IDLE);

    } catch (error: any) {
      console.error(error);
      
      // Handle Authentication Errors specifically
      const errorStr = JSON.stringify(error);
      if (
          error.status === 403 || 
          error.status === 404 || 
          (error.message && (error.message.includes('403') || error.message.includes('Permission denied'))) ||
          errorStr.includes("PERMISSION_DENIED")
      ) {
         setApiKeyReady(false); // Reset key state to force re-auth
         const errorMsg: Message = {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: "**SECURITY ALERT**: Uplink permission denied. The current encryption key is invalid or lacks the required clearance level for this model. Please re-authenticate.",
            timestamp: Date.now()
         };
         setMessages(prev => [...prev.filter(m => m.id !== aiMsgId), errorMsg]);
         setAppState(AppState.ERROR);
         return;
      }

      const errorMsg: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: "CRITICAL FAILURE. Service unavailable. Check console for details.",
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev.filter(m => m.id !== aiMsgId), errorMsg]);
      setAppState(AppState.ERROR);
      persistSession([...initialMessages, errorMsg], activeSessionId!);
    }
  };

  const handleRegenerate = async (messageId: string) => {
    if (!apiKeyReady) {
        handleConnectKey();
        return;
    }
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;

    const userMsgIndex = msgIndex - 1;
    if (userMsgIndex < 0 || messages[userMsgIndex].role !== 'user') return;
    
    const userMsg = messages[userMsgIndex];

    const historyState = messages.slice(0, userMsgIndex + 1);
    setMessages(historyState);
    setAppState(AppState.SEARCHING);
    
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
        const historyContext = historyState.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }] 
        }));

        const result = await performDeepSearch(
            userMsg.content, 
            historyContext, 
            userMsg.attachments || [],
            selectedModel,
            userProfile,
            userMsg.focusMode || 'all',
            (partialText) => {
               setMessages(currentMsgs => {
                 const newMsgs = [...currentMsgs];
                 const idx = newMsgs.findIndex(m => m.id === aiMsgId);
                 if (idx !== -1) {
                   newMsgs[idx] = {
                     ...newMsgs[idx],
                     content: partialText,
                     isThinking: false,
                     isStreaming: true
                   };
                 }
                 return newMsgs;
               });
               scrollToBottom();
            }
        );

        setMessages(currentMsgs => {
            const newMsgs = [...currentMsgs];
            const idx = newMsgs.findIndex(m => m.id === aiMsgId);
            if (idx !== -1) {
               newMsgs[idx] = {
                 ...newMsgs[idx],
                 content: result.text,
                 sources: result.sources,
                 images: result.images,
                 isStreaming: false,
                 isThinking: false
               };
               persistSession(newMsgs, currentSessionId);
            }
            return newMsgs;
        });
        setAppState(AppState.IDLE);

    } catch (error: any) {
        console.error(error);
        const errorStr = JSON.stringify(error);
        if (
            error.status === 403 || 
            (error.message && error.message.includes('403')) ||
             errorStr.includes("PERMISSION_DENIED")
        ) {
           setApiKeyReady(false);
           return;
        }

        const errorMsg: Message = {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: "Regeneration failed. Please try again.",
            timestamp: Date.now()
        };
        setMessages(prev => [...prev.filter(m => m.id !== aiMsgId), errorMsg]);
        setAppState(AppState.ERROR);
    }
  };

  const handleLoadSession = (session: ChatSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setAppState(AppState.IDLE);
  };

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation(); 
    const updated = deleteSessionById(sessionId);
    setSessions(updated);
    
    if (sessionId === currentSessionId) {
      handleReset();
    }
  };

  const startVoiceMode = async () => {
    if (!apiKeyReady) {
        handleConnectKey();
        return;
    }
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

  const endVoiceMode = () => {
    liveServiceRef.current?.disconnect();
    setAppState(AppState.IDLE);
  };

  const handleReset = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setAppState(AppState.IDLE);
    liveServiceRef.current?.disconnect();
  };

  const handleProfileSave = (updatedProfile: UserProfile) => {
    saveUserProfile(updatedProfile);
    setUserProfile(updatedProfile);
  };

  const handleClearData = () => {
    clearAllSessions();
    setSessions([]);
    handleReset();
  };

  let themeContainerClass = 'bg-[#0a0c10] text-slate-200'; 
  if (isLight) themeContainerClass = 'bg-slate-50 text-slate-800';
  else if (!isMinimal) themeContainerClass = 'text-aether-text'; 

  // Show nothing while checking key to prevent flash
  if (isCheckingKey) return <div className="min-h-screen bg-black" />;

  return (
    <div className={`relative min-h-screen flex overflow-hidden font-sans selection:bg-aether-accent/30 selection:text-white ${themeContainerClass}`}>
      
      {!apiKeyReady && (
         <LandingPage onConnect={handleConnectKey} isLight={isLight} />
      )}

      <VoiceOverlay 
        isActive={appState === AppState.VOICE_ACTIVE} 
        onClose={endVoiceMode}
        amplitude={voiceAmplitude}
      />

      <UserProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)}
        profile={userProfile}
        onSave={handleProfileSave}
        onClearData={handleClearData}
      />

      {/* --- BACKGROUND LAYER --- */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {isLight ? (
           <div className="absolute inset-0 bg-slate-50">
              <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
           </div>
        ) : isMinimal ? (
          <div className="absolute inset-0 bg-[#0a0c10]"></div>
        ) : (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/20 via-slate-950/80 to-slate-950"></div>
            <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] bg-purple-900/10 rounded-full blur-[120px] animate-nebula-move mix-blend-screen opacity-30"></div>
            <div className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] bg-aether-accent/5 rounded-full blur-[100px] animate-nebula-move mix-blend-screen opacity-20" style={{ animationDirection: 'reverse', animationDuration: '40s' }}></div>
            <div className="absolute top-[30%] left-[40%] w-[40vw] h-[40vw] bg-blue-900/5 rounded-full blur-[90px] animate-pulse-slow mix-blend-screen opacity-20"></div>
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)] opacity-20"></div>
            <div className="absolute inset-0">
              {particles.map((p) => (
                 <div 
                   key={p.id}
                   className={`absolute rounded-full animate-star-pulse ${p.size} ${p.color}`}
                   style={{ 
                     top: p.top, 
                     left: p.left, 
                     animationDelay: p.delay,
                     opacity: p.opacity
                   }}
                 ></div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Sidebar - Desktop */}
      <div className={`hidden md:flex flex-col w-20 lg:w-72 border-r p-6 sticky top-0 h-screen z-10 transition-colors duration-300
        ${isLight 
            ? 'bg-white border-slate-200' 
            : (isMinimal ? 'bg-[#0a0c10] border-slate-800' : 'bg-black/40 backdrop-blur-xl border-white/5')
        }
      `}>
        <div className="flex items-center gap-3 mb-10 cursor-pointer group" onClick={handleReset}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500
             ${isLight 
                ? 'bg-slate-900 text-white' 
                : (isMinimal ? 'bg-white text-black' : 'bg-gradient-to-br from-aether-accent to-purple-600 shadow-[0_0_20px_rgba(0,240,255,0.2)]')
             }
          `}>
             <i className="fa-solid fa-infinity text-lg"></i>
          </div>
          <div className="hidden lg:block">
             <span className={`font-bold text-xl tracking-wider ${isMinimal || isLight ? 'font-sans' : 'font-display'}`}>HYPERION</span>
          </div>
        </div>

        <button 
          onClick={handleReset}
          className={`flex items-center gap-3 px-4 py-3 border rounded-xl text-sm font-medium transition-all mb-8 group
             ${isLight
                ? 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900'
                : (isMinimal 
                   ? 'bg-transparent border-slate-700 hover:border-white text-slate-300 hover:text-white' 
                   : 'bg-white/5 hover:bg-white/10 border-white/5 hover:border-aether-accent/30 text-slate-300 hover:text-white')
             }
          `}
        >
          <div className={`p-1 rounded transition-transform group-hover:scale-110
             ${isLight 
                ? 'bg-slate-200 text-slate-700' 
                : (isMinimal ? 'bg-slate-800 text-white' : 'bg-slate-800 text-aether-accent')
             }
          `}>
             <i className="fa-solid fa-plus text-xs"></i>
          </div>
          <span className="hidden lg:block">New Search</span>
        </button>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 px-2 hidden lg:block">Recent</div>
          
          <div className="space-y-1">
            {sessions.map((session) => (
              <div 
                key={session.id} 
                onClick={() => handleLoadSession(session)}
                className={`group relative px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-all border
                  ${currentSessionId === session.id 
                    ? (isLight 
                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                        : (isMinimal 
                            ? 'bg-slate-800 text-white border-transparent' 
                            : 'bg-aether-accent/10 border-aether-accent/30 text-white shadow-[0_0_10px_rgba(0,240,255,0.1)]')
                      )
                    : (isLight 
                        ? 'bg-transparent border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900' 
                        : 'bg-transparent border-transparent text-slate-400 hover:bg-white/5 hover:text-white'
                      )
                  }
                `}
              >
                 <div className="flex justify-between items-center overflow-hidden">
                    <span className="truncate hidden lg:block">{session.title}</span>
                    <i className="lg:hidden fa-solid fa-message text-center w-full"></i>
                    <button 
                      onClick={(e) => handleDeleteSession(e, session.id)}
                      className="hidden lg:group-hover:block opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all"
                    >
                       <i className="fa-solid fa-xmark"></i>
                    </button>
                 </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`mt-auto pt-6 border-t space-y-2 ${isLight ? 'border-slate-200' : (isMinimal ? 'border-slate-800' : 'border-white/5')}`}>
           <button 
             onClick={() => setIsProfileOpen(true)}
             className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors group ${isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
           >
             {userProfile.avatar ? (
                <img src={userProfile.avatar} alt="User" className="w-8 h-8 rounded-lg object-cover" />
             ) : (
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-700 text-white'}`}>
                   {userProfile.username.charAt(0).toUpperCase()}
                </div>
             )}
             
             <div className="hidden lg:flex flex-col text-left">
                <span className={`text-sm font-medium ${isLight ? 'text-slate-800' : 'text-white'}`}>{userProfile.username}</span>
                <span className="text-[10px] text-slate-500">Settings</span>
             </div>
             <i className="fa-solid fa-gear ml-auto text-xs opacity-0 group-hover:opacity-100 transition-opacity"></i>
           </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        
        {/* Mobile Header */}
        <div className={`md:hidden flex items-center justify-between p-4 border-b z-30 sticky top-0
           ${isLight 
              ? 'bg-white/80 border-slate-200 backdrop-blur-md' 
              : (isMinimal ? 'bg-[#0a0c10] border-slate-800' : 'border-white/10 bg-black/50 backdrop-blur-md')
           }
        `}>
           <div className="flex items-center gap-2" onClick={handleReset}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center
                 ${isLight ? 'bg-slate-900 text-white' : (isMinimal ? 'bg-white text-black' : 'bg-gradient-to-tr from-aether-accent to-purple-500')}
              `}>
                 <i className="fa-solid fa-infinity text-xs"></i>
              </div>
              <span className={`font-bold text-lg tracking-wide ${isLight ? 'text-slate-900' : 'text-white'} ${isMinimal || isLight ? 'font-sans' : 'font-display'}`}>HYPERION</span>
           </div>
           <button onClick={() => setIsProfileOpen(true)} className="text-slate-400 hover:text-white">
              {userProfile.avatar ? (
                 <img src={userProfile.avatar} alt="User" className="w-8 h-8 rounded object-cover" />
              ) : (
                 <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center">
                    {userProfile.username.charAt(0).toUpperCase()}
                 </div>
              )}
           </button>
        </div>

        {/* Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-0 scroll-smooth relative custom-scrollbar">
           
           {messages.length === 0 && (
             <div className="min-h-full flex flex-col items-center justify-center -mt-20 px-4">
                <SearchBar 
                  onSearch={handleSearch} 
                  isLoading={appState === AppState.SEARCHING} 
                  selectedModel={selectedModel}
                  onModelSelect={setSelectedModel}
                  onVoiceStart={startVoiceMode}
                  isLight={isLight}
                />
             </div>
           )}

           {messages.length > 0 && (
             <div className="max-w-3xl mx-auto pt-10 pb-48 px-4 md:px-0">
                {messages.map((msg) => (
                  <MessageItem 
                    key={msg.id} 
                    message={msg} 
                    isLight={isLight}
                    textSize={userProfile.textSize}
                    onRegenerate={handleRegenerate}
                  />
                ))}
                <div ref={bottomRef} className="h-4" />
             </div>
           )}
        </div>

        {messages.length > 0 && (
          <div className="absolute bottom-6 left-0 right-0 px-4 md:px-0 z-50 flex justify-center pointer-events-none">
            <div className="pointer-events-auto w-full max-w-3xl">
              <SearchBar 
                onSearch={handleSearch} 
                isLoading={appState === AppState.SEARCHING} 
                isCompact={true}
                selectedModel={selectedModel}
                onModelSelect={setSelectedModel}
                onVoiceStart={startVoiceMode}
                isLight={isLight}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default App;