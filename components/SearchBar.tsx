import React, { useState, useRef, useEffect } from 'react';
import ModelSelector from './ModelSelector';
import { AIModel, FocusMode, Attachment } from '../types';

interface SearchBarProps {
  onSearch: (query: string, focusMode: FocusMode, attachments: Attachment[]) => void;
  isLoading: boolean;
  selectedModel: AIModel;
  onModelSelect: (model: AIModel) => void;
  onVoiceStart: () => void;
  variant?: 'home' | 'chat';
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  isLoading, 
  selectedModel,
  onModelSelect,
  onVoiceStart,
  variant = 'home'
}) => {
  const [query, setQuery] = useState('');
  const [focusMode, setFocusMode] = useState<FocusMode>('all');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [query]);

  const handleSubmit = () => {
    if ((!query.trim() && attachments.length === 0) || isLoading) return;
    onSearch(query, focusMode, attachments);
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
       // Mock file reading logic preserved from original
       const files: File[] = Array.from(e.target.files);
       for (const file of files) {
           const isText = file.type.startsWith('text') || file.name.endsWith('.ts') || file.name.endsWith('.py');
           const reader = new FileReader();
           reader.onload = (ev) => {
               const data = isText ? ev.target?.result as string : (ev.target?.result as string).split(',')[1];
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

  return (
    <div className={`w-full relative group transition-all duration-300 ${variant === 'home' ? 'scale-100' : 'scale-100'}`}>
       
       {/* Focus Pills - Only show on Home for cleanliness */}
       {variant === 'home' && (
          <div className="flex justify-center gap-2 mb-4">
             {['all', 'academic', 'writing', 'code', 'social'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFocusMode(mode as FocusMode)}
                  className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${focusMode === mode ? 'bg-primary text-background' : 'text-secondary hover:text-primary bg-surface_highlight'}`}
                >
                   {mode}
                </button>
             ))}
          </div>
       )}

       {/* Input Capsule - Removed overflow-hidden to allow dropdowns to pop out */}
       <div className={`relative flex flex-col bg-surface_highlight border border-border rounded-3xl shadow-lg transition-all focus-within:border-primary/20 focus-within:shadow-[0_0_20px_rgba(255,255,255,0.05)]
          ${variant === 'home' ? 'p-1' : 'p-1'}
       `}>
          
          {/* Attachments Preview */}
          {attachments.length > 0 && (
              <div className="flex gap-2 px-4 pt-3 overflow-x-auto scrollbar-hide">
                  {attachments.map(att => (
                      <div key={att.id} className="bg-surface border border-border rounded-lg px-2 py-1 flex items-center gap-2 text-xs text-primary">
                          <i className="fa-solid fa-file"></i>
                          <span className="truncate max-w-[100px]">{att.name}</span>
                          <button onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))} className="hover:text-red-400"><i className="fa-solid fa-xmark"></i></button>
                      </div>
                  ))}
              </div>
          )}

          <div className="flex items-end gap-2 px-2 pb-1">
             {/* Left Actions */}
             <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-10 h-10 rounded-full flex items-center justify-center text-secondary hover:text-primary hover:bg-white/5 transition-colors flex-shrink-0 mb-0.5"
                title="Attach"
             >
                <i className="fa-solid fa-paperclip text-lg"></i>
             </button>

             {/* Text Area */}
             <textarea
                ref={textareaRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={variant === 'home' ? "What do you want to know?" : "Ask follow-up..."}
                className="w-full bg-transparent text-primary text-lg px-2 py-3 focus:outline-none resize-none max-h-[200px] placeholder-secondary/50 font-light"
                rows={1}
             />

             {/* Right Actions */}
             <div className="flex items-center gap-1 mb-1 relative z-20">
                 {/* Model Selector Trigger */}
                 <ModelSelector selectedModel={selectedModel} onSelect={onModelSelect} />

                 {/* Voice */}
                 <button 
                    onClick={onVoiceStart}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-secondary hover:text-primary hover:bg-white/5 transition-colors"
                 >
                    <i className="fa-solid fa-microphone"></i>
                 </button>

                 {/* Submit */}
                 <button 
                    onClick={handleSubmit}
                    disabled={(!query && attachments.length === 0) || isLoading}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200
                       ${(!query && attachments.length === 0) || isLoading 
                          ? 'bg-surface text-secondary/30 cursor-not-allowed' 
                          : 'bg-primary text-background hover:scale-105 shadow-[0_0_10px_rgba(255,255,255,0.3)]'}
                    `}
                 >
                    {isLoading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-arrow-up"></i>}
                 </button>
             </div>
          </div>
       </div>

       <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileSelect} />
    </div>
  );
};

export default SearchBar;