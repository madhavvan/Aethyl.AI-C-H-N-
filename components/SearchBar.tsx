import React, { useState, useRef, useEffect } from 'react';
import ModelSelector from './ModelSelector';
import { AIModel, FocusMode, Attachment } from '../types';

interface SearchBarProps {
  onSearch: (query: string, focusMode: FocusMode, attachments: Attachment[]) => void;
  isLoading: boolean;
  isCompact?: boolean;
  selectedModel: AIModel;
  onModelSelect: (model: AIModel) => void;
  onVoiceStart: () => void;
  isLight?: boolean;
}

const SUPPORTED_BINARY_MIME_TYPES = [
  'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif',
  'application/pdf',
  'audio/wav', 'audio/mp3', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/flac',
  'video/mp4', 'video/mpeg', 'video/mov', 'video/avi', 'video/x-flv', 'video/mpg', 'video/webm', 'video/wmv', 'video/3gpp'
];

const SUPPORTED_TEXT_EXTENSIONS = [
  '.txt', '.md', '.html', '.css', '.js', '.jsx', '.ts', '.tsx', '.py', '.json', '.csv', '.xml', '.rb', '.java', '.c', '.cpp', '.h', '.sql', '.yaml', '.yml'
];

const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  isLoading, 
  isCompact = false,
  selectedModel,
  onModelSelect,
  onVoiceStart,
  isLight = false
}) => {
  const [query, setQuery] = useState('');
  const [focusMode, setFocusMode] = useState<FocusMode>('all');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!query.trim() && attachments.length === 0) || isLoading) return;
    
    onSearch(query, focusMode, attachments);
    setQuery('');
    setAttachments([]); // Clear attachments after send
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files: File[] = Array.from(e.target.files);
      const newAttachments: Attachment[] = [];
      let rejectedFiles = 0;

      for (const file of files) {
        try {
          const lowerName = file.name.toLowerCase();
          const isText = file.type.startsWith('text/') || SUPPORTED_TEXT_EXTENSIONS.some(ext => lowerName.endsWith(ext));
          const isSupportedBinary = SUPPORTED_BINARY_MIME_TYPES.includes(file.type);

          if (!isText && !isSupportedBinary) {
            console.warn(`File ${file.name} (${file.type}) skipped: Unsupported type.`);
            rejectedFiles++;
            continue;
          }

          const data = await readFile(file, isText);
          
          newAttachments.push({
            id: Math.random().toString(36).substring(7),
            name: file.name,
            type: file.type || (isText ? 'text/plain' : 'application/octet-stream'),
            data: data as string,
            isText: isText
          });
        } catch (err) {
          console.error("Error reading file", err);
        }
      }

      if (rejectedFiles > 0) {
        alert(`${rejectedFiles} file(s) were ignored because their format (e.g., .pptx, .docx) is not natively supported by the AI Visual Engine.`);
      }

      setAttachments(prev => [...prev, ...newAttachments]);
      // Reset input so same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const readFile = (file: File, isText: boolean): Promise<string | ArrayBuffer | null> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (isText) {
          resolve(reader.result);
        } else {
          // For binary, we need base64 without the prefix for Gemini
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        }
      };
      reader.onerror = reject;
      if (isText) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [query]);

  const focusOptions: { id: FocusMode; label: string; icon: string }[] = [
    { id: 'all', label: 'All', icon: 'fa-globe' },
    { id: 'academic', label: 'Academic', icon: 'fa-graduation-cap' },
    { id: 'code', label: 'Code', icon: 'fa-code' },
    { id: 'writing', label: 'Writing', icon: 'fa-pen-nib' },
    { id: 'social', label: 'Social', icon: 'fa-hashtag' },
  ];

  // Dynamic Styles
  const containerClass = isLight
    ? 'bg-white border-slate-200 shadow-xl hover:border-blue-400/30'
    : 'bg-slate-900/90 border-white/10 hover:border-aether-accent/30 shadow-2xl';
  
  const textColor = isLight ? 'text-slate-800' : 'text-white';
  const placeholderColor = isLight ? 'placeholder-slate-400' : 'placeholder-slate-500';
  const glowClass = isLight 
    ? 'from-blue-500 via-purple-400 to-blue-500 opacity-10 group-hover:opacity-20' 
    : 'from-aether-accent via-purple-600 to-aether-accent opacity-20 group-hover:opacity-40';
  
  const attachmentBg = isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800/50 border-slate-700';

  return (
    <div className={`w-full max-w-3xl mx-auto transition-all duration-700 ease-out ${isCompact ? 'translate-y-0' : 'translate-y-[15vh]'}`}>
      
      {!isCompact && (
        <div className="text-center mb-10 animate-in fade-in zoom-in duration-1000">
           <h1 className={`text-5xl md:text-7xl font-display font-black text-transparent bg-clip-text mb-6 tracking-tight ${isLight ? 'bg-gradient-to-b from-slate-800 via-slate-600 to-slate-400' : 'bg-gradient-to-b from-white via-slate-200 to-slate-500 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]'}`}>
            HYPERION<span className="text-aether-accent">_</span>OMNI
          </h1>
          <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-lg font-light tracking-wide max-w-md mx-auto`}>
            Traverse the digital void. <span className="text-aether-accent">Synthesize truth.</span>
          </p>
        </div>
      )}

      {/* Main Input Container */}
      <div className="relative group z-20">
        {/* Glow Effect behind */}
        <div className={`absolute -inset-1 bg-gradient-to-r rounded-2xl blur-lg transition duration-500 ${glowClass} ${isLoading ? 'animate-pulse opacity-50' : ''}`}></div>
        
        <div className={`relative flex flex-col backdrop-blur-xl border rounded-2xl transition-colors ${containerClass}`}>
          
          {/* Attachments Staging Area */}
          {attachments.length > 0 && (
            <div className="flex gap-2 px-4 pt-4 pb-0 overflow-x-auto scrollbar-hide">
              {attachments.map(att => (
                <div key={att.id} className={`relative group/att flex items-center gap-2 rounded-lg px-3 py-2 shrink-0 max-w-[200px] border ${attachmentBg}`}>
                  <div className={`w-8 h-8 rounded flex items-center justify-center text-aether-accent ${isLight ? 'bg-white' : 'bg-slate-700'}`}>
                    <i className={`fa-solid ${att.isText ? 'fa-file-code' : 'fa-file-image'}`}></i>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className={`text-xs truncate font-medium ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>{att.name}</span>
                    <span className="text-[10px] text-slate-500 uppercase">{att.isText ? 'CODE' : 'BINARY'}</span>
                  </div>
                  <button 
                    onClick={() => removeAttachment(att.id)}
                    className={`absolute -top-1.5 -right-1.5 w-5 h-5 border rounded-full flex items-center justify-center text-[10px] transition-colors opacity-0 group-hover/att:opacity-100 ${isLight ? 'bg-white border-slate-200 text-slate-400 hover:text-red-500' : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-red-400'}`}
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isCompact ? "Inject follow-up query..." : "Ask Hyperion... (or attach files)"}
            className={`w-full bg-transparent text-lg px-6 py-5 focus:outline-none resize-none max-h-[200px] overflow-y-auto font-light rounded-t-2xl ${textColor} ${placeholderColor}`}
            rows={1}
            disabled={isLoading}
          />
          
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-3 pb-3 mt-1 gap-3 md:gap-0">
            
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-hide pb-2 md:pb-0 px-2 md:px-0">
               {/* Focus Mode Pill Selector */}
               <div className={`flex rounded-lg p-1 border ${isLight ? 'bg-slate-100/50 border-slate-200' : 'bg-black/40 border-white/5'}`}>
                 {focusOptions.map((opt) => (
                   <button
                     key={opt.id}
                     onClick={() => setFocusMode(opt.id)}
                     className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all ${
                       focusMode === opt.id 
                       ? (isLight ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'bg-slate-700 text-aether-accent shadow-sm')
                       : (isLight ? 'text-slate-500 hover:text-slate-800 hover:bg-white/50' : 'text-slate-400 hover:text-white hover:bg-white/5')
                     }`}
                     title={opt.label}
                   >
                     <i className={`fa-solid ${opt.icon}`}></i>
                     <span className="hidden sm:inline">{opt.label}</span>
                   </button>
                 ))}
               </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end px-2 md:px-0">
               {/* Model Selector */}
               <ModelSelector 
                  selectedModel={selectedModel} 
                  onSelect={onModelSelect}
                  isLight={isLight}
               />

               <div className="flex items-center gap-2">
                  {/* Voice Button */}
                  <button
                    type="button" 
                    onClick={onVoiceStart}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isLight ? 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                    title="Voice Input"
                  >
                     <i className="fa-solid fa-microphone"></i>
                  </button>

                  {/* Attachment Trigger */}
                   <button
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isLight ? 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                    title="Attach File"
                  >
                     <i className="fa-solid fa-paperclip"></i>
                  </button>

                  {/* Submit Button */}
                  <button 
                    onClick={(e) => handleSubmit(e)}
                    disabled={(!query.trim() && attachments.length === 0) || isLoading}
                    className={`h-9 px-4 rounded-full font-bold transition-all flex items-center gap-2
                      ${(!query.trim() && attachments.length === 0) || isLoading 
                         ? (isLight ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-800 text-slate-600 cursor-not-allowed')
                         : (isLight 
                             ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-blue-500/30' 
                             : 'bg-white text-black hover:bg-aether-accent hover:shadow-[0_0_15px_rgba(0,240,255,0.4)]')
                      }
                    `}
                  >
                    {isLoading ? (
                       <i className="fa-solid fa-circle-notch fa-spin"></i>
                    ) : (
                       <i className="fa-solid fa-arrow-up"></i>
                    )}
                  </button>
               </div>
            </div>

          </div>
        </div>

        {/* Hidden File Input */}
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden"
          multiple
          onChange={handleFileSelect}
        />

      </div>
    </div>
  );
};

export default SearchBar;