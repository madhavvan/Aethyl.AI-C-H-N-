
import React from 'react';
import { Source } from '../types';

interface SourceCardProps {
  source: Source;
  index: number;
  isLight?: boolean;
}

const SourceCard: React.FC<SourceCardProps> = ({ source, index, isLight }) => {
  const getDomain = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch (e) {
      return 'data-source';
    }
  };

  const domain = getDomain(source.url);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

  const containerClasses = isLight 
    ? "bg-white border-slate-200 hover:border-blue-400 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] text-slate-800"
    : "bg-aether-glass border-slate-800 hover:border-aether-accent/50 hover:shadow-[0_0_15px_rgba(0,240,255,0.1)] text-white";

  const domainColor = isLight ? "text-slate-500 group-hover:text-blue-600" : "text-aether-muted group-hover:text-aether-accent";
  const titleColor = isLight ? "text-slate-700 group-hover:text-slate-900" : "text-slate-300 group-hover:text-white";
  const iconColor = isLight ? "text-slate-400 group-hover:text-blue-500" : "text-slate-600 group-hover:text-aether-accent";

  return (
    <a 
      href={source.url} 
      target="_blank" 
      rel="noopener noreferrer"
      className={`group relative flex-shrink-0 w-44 backdrop-blur-md border rounded-lg p-3 flex flex-col gap-2 transition-all duration-300 hover:-translate-y-1 ${containerClasses}`}
    >
      {/* Tech decoration - Only for Dark/Cyber modes */}
      {!isLight && (
        <>
          <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-aether-accent/30 rounded-tr-lg"></div>
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-aether-accent/30 rounded-bl-lg"></div>
        </>
      )}

      <div className="flex items-center gap-2">
         <div className="relative">
            {!isLight && <div className="absolute inset-0 bg-aether-accent/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>}
            <img 
                src={faviconUrl} 
                alt="icon" 
                className="relative w-4 h-4 rounded-full opacity-70 group-hover:opacity-100"
                onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://picsum.photos/32/32'; 
                }}
            />
         </div>
        <span className={`text-[10px] uppercase tracking-wider font-bold truncate transition-colors ${domainColor}`}>
          {domain}
        </span>
      </div>
      
      <div className={`text-xs font-medium leading-relaxed line-clamp-2 h-8 transition-colors ${titleColor}`}>
        {source.title}
      </div>
      
      <div className="mt-auto flex justify-between items-end">
         <div className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-slate-600'}`}>
            REF_0{index + 1}
         </div>
         <i className={`fa-solid fa-arrow-up-right-from-square text-[10px] transition-colors ${iconColor}`}></i>
      </div>
    </a>
  );
};

export default SourceCard;
