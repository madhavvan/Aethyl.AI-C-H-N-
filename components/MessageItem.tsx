
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../types';
import SourceCard from './SourceCard';
import ThinkingIndicator from './ThinkingIndicator';

interface MessageItemProps {
  message: Message;
  isLight?: boolean;
  textSize?: number; // percentage
  onRegenerate?: (id: string) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, isLight, textSize = 100, onRegenerate }) => {
  const isUser = message.role === 'user';
  const [isCopied, setIsCopied] = useState(false);
  
  // Font Size Logic
  const fontStyle = { fontSize: `${textSize}%` };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Aether Lens Search',
                text: message.content
            });
        } catch (err) {
            console.error('Share failed:', err);
        }
    } else {
        handleCopy();
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end mb-8 group">
        <div 
          className={`backdrop-blur-sm max-w-2xl px-6 py-4 rounded-2xl rounded-tr-none border shadow-lg transition-colors ${isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-800/80 text-white border-slate-700 group-hover:border-slate-600'}`}
          style={fontStyle}
        >
          <p className="leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  // Assistant Message
  return (
    <div className="flex flex-col gap-6 mb-16 animate-in fade-in slide-in-from-bottom-2 duration-700">
      
      {/* Sources Section */}
      {message.sources && message.sources.length > 0 && (
        <div className="mb-2 pl-12 animate-in fade-in slide-in-from-left-4 duration-700">
          <div className={`flex items-center gap-2 mb-3 uppercase tracking-widest text-[10px] font-bold font-display ${isLight ? 'text-slate-500' : 'text-aether-muted'}`}>
            <i className={`fa-solid fa-database ${isLight ? 'text-blue-500' : 'text-aether-accent'}`}></i>
            Knowledge Sources
          </div>
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide mask-fade-right">
            {message.sources.map((source, idx) => (
              <SourceCard key={idx} source={source} index={idx} isLight={isLight} />
            ))}
          </div>
        </div>
      )}

      {/* Answer Section */}
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0 mt-1">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLight ? 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-md' : 'bg-gradient-to-br from-aether-accent to-purple-600 shadow-[0_0_15px_rgba(0,240,255,0.3)]'}`}>
            <i className={`fa-solid fa-infinity text-sm ${isLight ? 'text-white' : 'text-black'}`}></i>
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
           {/* Header Info */}
           <div className="flex items-center justify-between mb-3">
             <div className="flex items-center gap-2">
               <span className={`font-display text-sm font-bold tracking-wide ${isLight ? 'text-blue-600' : 'text-aether-accent'}`}>AETHER_LENS</span>
               {message.modelUsed && (
                 <span className={`text-[10px] px-2 py-0.5 rounded border font-mono ${isLight ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-slate-900/50 border-slate-800 text-slate-500'}`}>
                   {message.modelUsed}
                 </span>
               )}
             </div>
             <div className={`text-xs font-mono ${isLight ? 'text-slate-400' : 'text-slate-600'}`}>
               {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </div>
           </div>
          
          {/* Thinking State */}
          {message.isThinking && (
             <ThinkingIndicator />
          )}

          {/* Text Content */}
          <div 
             className={`prose max-w-none ${isLight ? 'prose-slate' : 'prose-invert'} ${isLight ? 'text-slate-800' : 'text-slate-300'}`}
             style={fontStyle}
          >
             <ReactMarkdown 
               components={{
                 // Custom renderer to ensure styling consistency
                 p: ({node, ...props}) => <p className={`mb-4 leading-7 ${isLight ? 'text-slate-800' : 'text-slate-300'}`} {...props} />,
                 strong: ({node, ...props}) => <strong className={`font-semibold ${isLight ? 'text-blue-600' : 'text-aether-accent'}`} {...props} />,
                 code: ({node, ...props}) => <code className={`${isLight ? 'bg-slate-100 border-slate-200 text-blue-600' : 'bg-slate-800/50 border-slate-700 text-sky-400'}`} {...props} />,
                 a: ({node, ...props}) => <a className={`${isLight ? 'text-blue-600 border-blue-600 hover:text-blue-800' : 'text-aether-accent border-aether-accent hover:text-white'}`} {...props} />
               }}
             >
               {message.content}
             </ReactMarkdown>
             
             {/* Blinking Cursor for streaming */}
             {message.isStreaming && (
                <span className={`inline-block w-2 h-4 ml-1 align-middle animate-pulse ${isLight ? 'bg-blue-600' : 'bg-aether-accent'}`}></span>
             )}
          </div>

          {/* Generated Images Gallery */}
          {message.images && message.images.length > 0 && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              {message.images.map((imgSrc, idx) => (
                <div key={idx} className={`relative group rounded-xl overflow-hidden border shadow-2xl animate-in zoom-in-95 duration-500 ${isLight ? 'bg-white border-slate-200' : 'bg-black border-slate-700'}`}>
                  <div className={`absolute inset-0 bg-gradient-to-t opacity-60 ${isLight ? 'from-slate-900/50' : 'from-black/80'}`}></div>
                  <img 
                    src={imgSrc} 
                    alt={`Generated artifact ${idx + 1}`}
                    className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex justify-between items-center">
                    <span className={`text-xs font-mono ${isLight ? 'text-white' : 'text-aether-accent'}`}>GEN_ARTIFACT_0{idx+1}</span>
                    <button className="text-xs bg-white/10 hover:bg-white/30 backdrop-blur border border-white/20 text-white px-3 py-1.5 rounded-lg transition-colors">
                      <i className="fa-solid fa-download mr-1"></i> Save
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Bar */}
          {!message.isStreaming && !message.isThinking && (
            <div className={`flex items-center gap-6 mt-6 pt-4 border-t animate-in fade-in duration-500 ${isLight ? 'border-slate-200' : 'border-slate-800/50'}`}>
              <button 
                onClick={handleCopy}
                className={`text-xs flex items-center gap-2 transition-colors ${isLight ? 'text-slate-400 hover:text-blue-600' : 'text-slate-500 hover:text-aether-accent'}`}
              >
                <i className={`fa-regular ${isCopied ? 'fa-check' : 'fa-copy'}`}></i> 
                {isCopied ? 'Copied' : 'Copy'}
              </button>
              <button 
                onClick={handleShare}
                className={`text-xs flex items-center gap-2 transition-colors ${isLight ? 'text-slate-400 hover:text-blue-600' : 'text-slate-500 hover:text-aether-accent'}`}>
                <i className="fa-solid fa-share-nodes"></i> Share
              </button>
              <button 
                onClick={() => onRegenerate && onRegenerate(message.id)}
                className={`text-xs flex items-center gap-2 transition-colors ml-auto ${isLight ? 'text-slate-400 hover:text-blue-600' : 'text-slate-500 hover:text-aether-accent'}`}>
                <i className="fa-solid fa-rotate-right"></i> Regenerate
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default MessageItem;
