import React, { useState, useRef, useEffect } from 'react';
import ModelSelector from './ModelSelector';
import { AIModel, FocusMode, Attachment, Quote } from '../types';

interface SearchBarProps {
  onSearch: (query: string, focusMode: FocusMode, attachments: Attachment[], quotes: Quote[]) => void;
  isLoading: boolean;
  selectedModel: AIModel;
  onModelSelect: (model: AIModel) => void;
  onVoiceStart: () => void;
  variant?: 'home' | 'chat';
  quotes?: Quote[];
  onRemoveQuote?: (id: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  isLoading, 
  selectedModel,
  onModelSelect,
  onVoiceStart,
  variant = 'home',
  quotes = [],
  onRemoveQuote
}) => {
  const [query, setQuery] = useState('');
  const [focusMode, setFocusMode] = useState<FocusMode>('all');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isFocusOpen, setIsFocusOpen] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const focusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [query]);

  // Handle clicking outside focus menu
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (focusRef.current && !focusRef.current.contains(event.target as Node)) {
              setIsFocusOpen(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = () => {
    if ((!query.trim() && attachments.length === 0 && quotes.length === 0) || isLoading) return;
    onSearch(query, focusMode, attachments, quotes);
    setQuery('');
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
       const files: File[] = Array.from(e.target.files);
       for (const file of files) {
           const isText = file.type.startsWith('text') || file.name.endsWith('.ts') || file.name.endsWith('.py') || file.name.endsWith('.json') || file.name.endsWith('.md');
           const reader = new FileReader();
           reader.onload = (ev) => {
               const raw = ev.target?.result as string;
               const data = isText ? raw : raw.split(',')[1];
               setAttachments(prev => [...prev, {
                   id: Math.random().toString(),
                   name: file.name,
                   type: file.type || 'application/octet-stream',
                   data,
                   isText
               }]);
           };
           isText ? reader.readAsText(file) : reader.readAsDataURL(file);
       }
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const getFocusIcon = (mode: FocusMode) => {
      switch(mode) {
          case 'academic': return 'fa-graduation-cap';
          case 'writing': return 'fa-pen-nib';
          case 'code': return 'fa-code';
          case 'social': return 'fa-hashtag';
          default: return 'fa-globe';
      }
  };

  return (
    <div className="w-full relative group">
       
       {/* Input Area - Plain, Professional, No "Box" Effect */}
       <div className="relative flex flex-col bg-surface border border-border rounded-xl transition-colors duration-200">
          
          {/* QUOTED CONTEXT AREA */}
          {quotes.length > 0 && (
             <div className="flex gap-2 px-3 pt-3 pb-1 overflow-x-auto scrollbar-hide">
                {quotes.map(quote => (
                   <div key={quote.id} className="flex-shrink-0 max-w-[200px] bg-background border border-border rounded p-2 group/quote relative">
                      <div className="text-[10px] text-secondary mb-1 flex items-center gap-1 uppercase font-bold tracking-wider">
                         <i className="fa-solid fa-quote-right text-accent"></i> Context
                      </div>
                      <div className="text-xs text-primary truncate">{quote.text}</div>
                      <button 
                         onClick={() => onRemoveQuote?.(quote.id)}
                         className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[8px] opacity-0 group-hover/quote:opacity-100 transition-opacity"
                      >
                         <i className="fa-solid fa-xmark"></i>
                      </button>
                   </div>
                ))}
             </div>
          )}

          {/* ATTACHMENT PREVIEW AREA */}
          {attachments.length > 0 && (
            <div className="flex gap-2 px-3 pt-3 pb-1 overflow-x-auto scrollbar-hide">
                {attachments.map(att => (
                   <div key={att.id} className="flex-shrink-0 max-w-[150px] bg-background border border-border rounded p-2 group/att relative flex items-center gap-2">
                      <div className="w-6 h-6 bg-surface_highlight rounded flex items-center justify-center text-secondary">
                          <i className={`fa-solid ${att.isText ? 'fa-file-lines' : 'fa-image'} text-[10px]`}></i>
                      </div>
                      <div className="text-xs text-primary truncate flex-1">{att.name}</div>
                      <button 
                         onClick={() => removeAttachment(att.id)}
                         className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-surface_highlight border border-border rounded-full flex items-center justify-center text-secondary hover:text-red-400 text-[8px]"
                      >
                         <i className="fa-solid fa-xmark"></i>
                      </button>
                   </div>
                ))}
            </div>
          )}

          <div className="flex items-end gap-2 p-2">
             <button 
               onClick={() => fileInputRef.current?.click()}
               className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:text-primary hover:bg-surface_highlight transition-colors"
               title="Attach File"
             >
                <i className="fa-solid fa-paperclip"></i>
             </button>
             <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileSelect} />

             <textarea
                ref={textareaRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isLoading ? "Thinking..." : "Ask anything..."}
                disabled={isLoading}
                rows={1}
                className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none outline-none text-primary placeholder-secondary/50 resize-none py-2 max-h-[200px] min-h-[40px] text-[15px]"
             />

             {query.trim() || attachments.length > 0 || quotes.length > 0 ? (
                 <button 
                   onClick={handleSubmit}
                   className="w-8 h-8 rounded-lg bg-primary text-background flex items-center justify-center hover:opacity-90 transition-opacity"
                 >
                    <i className="fa-solid fa-arrow-up"></i>
                 </button>
             ) : (
                 <button 
                   onClick={onVoiceStart}
                   className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:text-primary hover:bg-surface_highlight transition-colors"
                 >
                    <i className="fa-solid fa-microphone"></i>
                 </button>
             )}
          </div>
          
          <div className="flex items-center justify-between px-3 pb-2 select-none">
              
              {/* Focus Selector */}
              <div className="relative" ref={focusRef}>
                  <button 
                      onClick={() => setIsFocusOpen(!isFocusOpen)}
                      className={`flex items-center gap-2 text-xs font-medium transition-colors px-2 py-1 rounded-lg hover:bg-white/5 ${focusMode !== 'all' ? 'text-accent' : 'text-secondary'}`}
                  >
                      <i className={`fa-solid ${getFocusIcon(focusMode)}`}></i>
                      <span className="capitalize">{focusMode === 'all' ? 'Focus' : focusMode}</span>
                  </button>
                  
                  {isFocusOpen && (
                      <div className="absolute bottom-full left-0 mb-2 w-48 bg-[#18181b] border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2">
                          <div className="px-3 py-2 text-[10px] font-bold text-secondary border-b border-border bg-black/20 uppercase tracking-wider">Search Focus</div>
                          {['all', 'academic', 'writing', 'code', 'social'].map((mode) => (
                              <button
                                  key={mode}
                                  onClick={() => { setFocusMode(mode as FocusMode); setIsFocusOpen(false); }}
                                  className={`w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-white/5 transition-colors ${focusMode === mode ? 'text-accent bg-accent/5' : 'text-secondary'}`}
                              >
                                   <i className={`fa-solid w-4 text-center ${getFocusIcon(mode as FocusMode)}`}></i>
                                   <span className="capitalize text-sm">{mode}</span>
                                   {focusMode === mode && <i className="fa-solid fa-check ml-auto text-xs"></i>}
                              </button>
                          ))}
                      </div>
                  )}
              </div>

              <ModelSelector selectedModel={selectedModel} onSelect={onModelSelect} />
          </div>
       </div>
    </div>
  );
};

export default SearchBar;