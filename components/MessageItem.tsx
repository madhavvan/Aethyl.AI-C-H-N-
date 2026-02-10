import React, { useState, memo } from 'react';
import { Message } from '../types';
import SourceCard from './SourceCard';
import ThinkingIndicator from './ThinkingIndicator';
import DocumentRenderer from './DocumentRenderer';

interface MessageItemProps {
  message: Message;
  textSize?: number;
  onRegenerate?: (id: string) => void;
}

const MessageItem: React.FC<MessageItemProps> = memo(({ message, textSize = 100, onRegenerate }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(message.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy text:', err);
      }
  };

  if (isUser) {
    return (
      <div className="flex justify-end mb-8">
        <div className="bg-surface_highlight text-primary max-w-[85%] px-6 py-5 rounded-2xl rounded-tr-sm border border-border shadow-sm relative group/msg">
           {/* Render Quotes if present */}
           {message.quotes && message.quotes.length > 0 && (
             <div className="flex flex-col gap-2 mb-3">
               {message.quotes.map((q, i) => (
                 <div key={i} className="text-xs bg-black/20 border-l-2 border-accent pl-3 py-1.5 text-secondary italic rounded-r">
                   "{q.text}"
                 </div>
               ))}
             </div>
           )}

           <div className="whitespace-pre-wrap leading-relaxed text-[16px]">{message.content}</div>
           
           {message.attachments && message.attachments.length > 0 && (
               <div className="mt-4 flex gap-2 overflow-x-auto">
                   {message.attachments.map(att => (
                       <div key={att.id} className="text-xs bg-black/30 px-3 py-1.5 rounded-md border border-white/10 flex items-center gap-2 font-mono">
                           <i className="fa-solid fa-paperclip"></i> {att.name}
                       </div>
                   ))}
               </div>
           )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 mb-16 animate-fade-in group w-full">
       {/* Header with Model Badge */}
       <div className="flex items-center gap-3 select-none">
          <div className="w-6 h-6 rounded-md bg-surface text-primary border border-border flex items-center justify-center">
              <i className="fa-solid fa-bolt text-xs"></i>
          </div>
          <span className="text-sm font-bold text-primary tracking-wide">Hyperion</span>
          {message.modelUsed && (
             <span className="text-[10px] text-secondary border border-border px-1.5 py-0.5 rounded font-mono uppercase opacity-70">{message.modelUsed}</span>
          )}
       </div>

       {/* Thinking Indicator */}
       {message.isThinking && <ThinkingIndicator />}

       {/* Sources Carousel */}
       {message.sources && message.sources.length > 0 && (
           <div className="mb-6">
               <div className="flex items-center gap-2 mb-3 text-xs font-bold text-secondary uppercase tracking-wider">
                   <i className="fa-solid fa-layer-group"></i> Sources
               </div>
               <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                   {message.sources.map((src, idx) => (
                       <SourceCard key={idx} source={src} index={idx} />
                   ))}
               </div>
           </div>
       )}

       {/* Content via Document Renderer */}
       <DocumentRenderer content={message.content} />

       {/* Generated Images */}
       {message.images && message.images.length > 0 && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
               {message.images.map((img, i) => (
                   <img key={i} src={img} className="rounded-xl border border-border w-full h-auto hover:opacity-95 transition-opacity cursor-pointer shadow-2xl" alt="Generated" />
               ))}
           </div>
       )}

       {/* Footer Actions */}
       {!message.isStreaming && !message.isThinking && (
           <div className="flex items-center gap-4 mt-6 text-secondary text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200">
               <button onClick={handleCopy} className="hover:text-primary flex items-center gap-1.5 transition-colors p-1" title="Copy message">
                   <i className={`fa-regular ${copied ? 'fa-check text-green-400' : 'fa-copy'}`}></i>
               </button>
               <button onClick={() => onRegenerate?.(message.id)} className="hover:text-primary flex items-center gap-1.5 transition-colors p-1" title="Regenerate">
                   <i className="fa-solid fa-rotate-right"></i>
               </button>
           </div>
       )}
    </div>
  );
}, (prev, next) => {
    return prev.message.content === next.message.content &&
           prev.message.isStreaming === next.message.isStreaming &&
           prev.message.isThinking === next.message.isThinking &&
           prev.textSize === next.textSize;
});

export default MessageItem;