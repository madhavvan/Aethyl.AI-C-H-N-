import React, { useState, useRef, useEffect } from 'react';
import { AIModel } from '../types';
import { AI_MODELS } from '../constants';

const ModelSelector: React.FC<{ selectedModel: AIModel, onSelect: (m: AIModel) => void, isLight?: boolean }> = ({ selectedModel, onSelect }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  return (
    <div className="relative" ref={ref}>
       <button 
         onClick={() => setOpen(!open)}
         className="flex items-center gap-1 text-sm font-medium text-secondary hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
       >
          <span>{selectedModel.name.split(' ')[0]}</span>
          <i className="fa-solid fa-chevron-down text-[10px]"></i>
       </button>

       {open && (
           <div className="absolute bottom-full right-0 mb-2 w-64 bg-[#18181b] border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
               <div className="px-3 py-2 text-xs font-bold text-secondary border-b border-border bg-black/20">Select Model</div>
               <div className="max-h-60 overflow-y-auto">
                   {AI_MODELS.map(m => (
                       <button
                          key={m.id}
                          onClick={() => { onSelect(m); setOpen(false); }}
                          className={`w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors ${selectedModel.id === m.id ? 'bg-white/5' : ''}`}
                       >
                          <div className={`w-6 h-6 rounded flex items-center justify-center ${selectedModel.id === m.id ? 'text-white' : 'text-secondary'}`}>
                              <i className={`fa-solid ${m.icon} text-xs`}></i>
                          </div>
                          <div>
                              <div className={`text-sm font-medium ${selectedModel.id === m.id ? 'text-white' : 'text-secondary'}`}>{m.name}</div>
                              {m.badge && <span className="text-[9px] px-1 rounded border border-accent/30 text-accent inline-block mt-0.5">{m.badge}</span>}
                          </div>
                       </button>
                   ))}
               </div>
           </div>
       )}
    </div>
  );
};

export default ModelSelector;