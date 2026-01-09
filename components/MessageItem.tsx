import React, { useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../types';
import SourceCard from './SourceCard';
import ThinkingIndicator from './ThinkingIndicator';

interface MessageItemProps {
  message: Message;
  textSize?: number;
  onRegenerate?: (id: string) => void;
}

const MessageItem: React.FC<MessageItemProps> = memo(({ message, textSize = 100, onRegenerate }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
      navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end mb-8">
        <div className="bg-surface_highlight text-primary max-w-[85%] px-5 py-3 rounded-2xl rounded-tr-sm border border-border shadow-sm">
           <div className="whitespace-pre-wrap leading-relaxed text-[15px]">{message.content}</div>
           {message.attachments && message.attachments.length > 0 && (
               <div className="mt-3 flex gap-2 overflow-x-auto">
                   {message.attachments.map(att => (
                       <div key={att.id} className="text-xs bg-black/30 px-2 py-1 rounded border border-white/10 flex items-center gap-1">
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
    <div className="flex flex-col gap-4 mb-10 animate-fade-in group">
       {/* Header with Model Badge */}
       <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-surface text-primary border border-border flex items-center justify-center">
              <i className="fa-solid fa-bolt text-xs"></i>
          </div>
          <span className="text-sm font-bold text-primary">Hyperion</span>
          {message.modelUsed && (
             <span className="text-[10px] text-secondary border border-border px-1.5 py-0.5 rounded font-mono uppercase">{message.modelUsed}</span>
          )}
       </div>

       {/* Thinking Indicator */}
       {message.isThinking && <ThinkingIndicator />}

       {/* Sources Carousel */}
       {message.sources && message.sources.length > 0 && (
           <div className="mb-2">
               <div className="flex items-center gap-2 mb-2 text-xs font-bold text-secondary uppercase tracking-wider">
                   <i className="fa-solid fa-layer-group"></i> Sources
               </div>
               <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                   {message.sources.map((src, idx) => (
                       <SourceCard key={idx} source={src} index={idx} />
                   ))}
               </div>
           </div>
       )}

       {/* Content */}
       <div className="prose prose-invert max-w-none prose-p:leading-7 prose-pre:bg-surface_highlight prose-pre:border prose-pre:border-border prose-a:text-accent prose-headings:font-display prose-headings:text-primary prose-strong:text-primary text-primary">
           <ReactMarkdown
               components={{
                   code: ({node, ...props}) => <code className="bg-surface_highlight text-red-200 rounded px-1" {...props} />
               }}
           >
               {message.content}
           </ReactMarkdown>
       </div>

       {/* Images */}
       {message.images && message.images.length > 0 && (
           <div className="grid grid-cols-2 gap-3 mt-4">
               {message.images.map((img, i) => (
                   <img key={i} src={img} className="rounded-xl border border-border w-full h-auto hover:opacity-90 transition-opacity cursor-pointer shadow-md" alt="Generated" />
               ))}
           </div>
       )}

       {/* Footer Actions */}
       {!message.isStreaming && !message.isThinking && (
           <div className="flex items-center gap-4 mt-2 text-secondary text-sm opacity-0 group-hover:opacity-100 transition-opacity">
               <button onClick={handleCopy} className="hover:text-primary flex items-center gap-1.5 transition-colors">
                   <i className={`fa-regular ${copied ? 'fa-check' : 'fa-copy'}`}></i>
               </button>
               <button onClick={() => onRegenerate?.(message.id)} className="hover:text-primary flex items-center gap-1.5 transition-colors">
                   <i className="fa-solid fa-rotate-right"></i>
               </button>
           </div>
       )}
    </div>
  );
}, (prev, next) => {
    // Custom comparison for performance: only re-render if content, streaming status, or thinking status changes
    return prev.message.content === next.message.content &&
           prev.message.isStreaming === next.message.isStreaming &&
           prev.message.isThinking === next.message.isThinking &&
           prev.textSize === next.textSize;
});

export default MessageItem;