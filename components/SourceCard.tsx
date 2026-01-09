import React from 'react';
import { Source } from '../types';

const SourceCard: React.FC<{ source: Source, index: number, isLight?: boolean }> = ({ source, index }) => {
  const getDomain = (url: string) => {
      try { return new URL(url).hostname.replace('www.', ''); } catch { return 'web'; }
  };
  
  const domain = getDomain(source.url);
  const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

  return (
    <a 
      href={source.url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="flex-shrink-0 w-36 h-20 bg-surface border border-border hover:border-accent hover:bg-surface_highlight rounded-lg p-2.5 flex flex-col justify-between transition-all group"
    >
      <div className="text-[11px] font-medium text-white line-clamp-2 leading-tight group-hover:text-accent">
         {source.title}
      </div>
      <div className="flex items-center gap-1.5 mt-2">
         <img src={favicon} className="w-3 h-3 rounded-full opacity-70" alt="" onError={(e) => (e.target as HTMLImageElement).src='https://picsum.photos/16'} />
         <span className="text-[10px] text-secondary truncate">{domain}</span>
         <span className="text-[9px] text-secondary ml-auto">{index + 1}</span>
      </div>
    </a>
  );
};

export default SourceCard;