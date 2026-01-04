

import React, { useState, useRef, useEffect } from 'react';
import { AIModel } from '../types';
import { AI_MODELS } from '../constants';

interface ModelSelectorProps {
  selectedModel: AIModel;
  onSelect: (model: AIModel) => void;
  disabled?: boolean;
  isLight?: boolean;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onSelect, disabled, isLight }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const buttonClasses = isLight
    ? isOpen 
      ? 'bg-white border-blue-500 text-blue-600 shadow-md' 
      : 'bg-transparent border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
    : isOpen 
      ? 'bg-slate-800 border-aether-accent text-aether-accent shadow-[0_0_10px_rgba(0,240,255,0.2)]' 
      : 'bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-white/5';

  const dropdownClasses = isLight
    ? 'bg-white/95 border-slate-200 shadow-xl'
    : 'bg-slate-900/95 border-slate-700 shadow-2xl';

  const headerClasses = isLight
    ? 'text-slate-500 border-slate-200 bg-slate-50'
    : 'text-slate-500 border-slate-700/50 bg-slate-950/30';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border ${buttonClasses} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <i className={`fa-solid ${selectedModel.icon} w-4 text-center`}></i>
        <span className="hidden md:inline">{selectedModel.name}</span>
        <i className={`fa-solid fa-chevron-down text-xs transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}></i>
      </button>

      {isOpen && (
        <div className={`absolute bottom-full mb-3 right-0 w-80 md:w-96 backdrop-blur-xl border rounded-xl z-50 animate-in fade-in slide-in-from-bottom-2 origin-bottom-right ${dropdownClasses}`}>
          <div className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b flex justify-between items-center ${headerClasses}`}>
            <span>Available Neural Models</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${isLight ? 'bg-slate-100 text-slate-500 border-slate-300' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>v4.2</span>
          </div>
          <div className="max-h-[50vh] overflow-y-auto py-1 custom-scrollbar">
            {AI_MODELS.map((model) => {
              const isSelected = selectedModel.id === model.id;
              
              const itemHoverClass = isLight ? 'hover:bg-slate-50' : 'hover:bg-white/5';
              const selectedBgClass = isLight 
                 ? (isSelected ? 'bg-blue-50 border-blue-500' : 'border-transparent')
                 : (isSelected ? 'bg-aether-accent/5 border-aether-accent' : 'border-transparent');
              
              const iconBoxClass = isLight
                 ? (isSelected ? 'bg-blue-100 border-blue-200 text-blue-600' : 'bg-slate-100 border-slate-200 text-slate-500 group-hover:border-slate-300 group-hover:text-slate-700')
                 : (isSelected ? 'bg-aether-accent/10 border-aether-accent text-aether-accent' : 'bg-slate-800 border-slate-700 text-slate-400 group-hover:border-slate-500 group-hover:text-slate-200');

              return (
                <button
                  key={model.id}
                  onClick={() => {
                    onSelect(model);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-all group border-l-2 ${itemHoverClass} ${selectedBgClass}`}
                >
                  <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${iconBoxClass}`}>
                    <i className={`fa-solid ${model.icon} text-sm`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold truncate ${isSelected ? (isLight ? 'text-blue-600' : 'text-aether-accent') : (isLight ? 'text-slate-800 group-hover:text-black' : 'text-slate-200 group-hover:text-white')}`}>
                        {model.name}
                      </span>
                      {model.badge && (
                        <span className={`text-[10px] px-1.5 rounded border font-mono lowercase ${model.badgeColor || 'text-slate-400 border-slate-600'}`}>
                          {model.badge}
                        </span>
                      )}
                      {isSelected && !model.badge && (
                         <i className={`fa-solid fa-circle-check text-xs ml-auto ${isLight ? 'text-blue-500' : 'text-aether-accent'}`}></i>
                      )}
                    </div>
                    <div className={`text-[10px] mt-0.5 leading-relaxed ${isLight ? 'text-slate-500 group-hover:text-slate-600' : 'text-slate-500 group-hover:text-slate-400'}`}>
                      {model.description}
                    </div>
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                       <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${isLight ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-slate-800 text-slate-500 border-slate-700/50'}`}>
                          {model.provider}
                       </span>
                       {model.supportsImageGeneration && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-900/20 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                             <i className="fa-solid fa-image"></i> Visual
                          </span>
                       )}
                       {model.useThinking && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-900/20 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                             <i className="fa-solid fa-brain"></i> Thinking
                          </span>
                       )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;