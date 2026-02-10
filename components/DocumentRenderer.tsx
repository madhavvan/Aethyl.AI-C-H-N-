import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Custom Code Block Component (PrismJS + Tomorrow Theme)
 */
const CodeBlock: React.FC<{ language: string, value: string }> = ({ language, value }) => {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Trigger Prism highlight when code/language changes
    if (codeRef.current && (window as any).Prism) {
      (window as any).Prism.highlightElement(codeRef.current);
    }
  }, [value, language]);

  const handleCopy = async () => {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const langClass = language ? `language-${language.toLowerCase()}` : 'language-text';

  return (
    <div className="my-6 rounded-lg overflow-hidden border border-border bg-[#0d1117] shadow-sm group/code not-prose">
      <div className="flex items-center justify-between px-3 py-2 bg-[#161b22] border-b border-border/40 select-none">
        <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-secondary/80 font-bold lowercase">
              {language || 'text'}
            </span>
        </div>
        <button 
           onClick={handleCopy} 
           className="flex items-center gap-1.5 text-[10px] text-secondary hover:text-white transition-colors focus:outline-none bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md border border-white/5"
           title="Copy code"
        >
           {copied ? (
             <>
               <i className="fa-solid fa-check text-green-400"></i>
               <span className="text-green-400 font-medium">Copied</span>
             </>
           ) : (
             <>
               <i className="fa-regular fa-copy"></i>
               <span>Copy</span>
             </>
           )}
        </button>
      </div>
      <div className="relative overflow-x-auto">
        <pre 
            className="!m-0 !p-4 !bg-transparent text-[13px] font-mono leading-relaxed overflow-auto custom-scrollbar"
            style={{ backgroundColor: 'transparent' }} 
        >
          <code 
            ref={codeRef} 
            className={`${langClass} !bg-transparent !shadow-none`}
            style={{ textShadow: 'none', fontFamily: '"JetBrains Mono", monospace' }}
          >
            {value}
          </code>
        </pre>
      </div>
    </div>
  );
};

// --- Custom "Doc" Components ---

// Info Box (replaces blockquote)
const InfoBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="my-6 rounded-r-lg border-l-[3px] border-primary/40 bg-surface_highlight/20 p-4 shadow-sm not-prose">
      <div className="flex gap-3 items-start">
        <div className="text-primary/70 mt-[3px] text-sm">
          <i className="fa-solid fa-info-circle"></i>
        </div>
        <div className="flex-1 text-primary/90 leading-7 text-[15px] font-normal font-sans">
          {children}
        </div>
      </div>
    </div>
);

// Styled Table
const Table: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="overflow-x-auto my-8 rounded-lg border border-border bg-surface_highlight/5 shadow-sm">
        <table className="w-full text-left border-collapse">
            {children}
        </table>
    </div>
);

const TableHead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <thead className="bg-surface_highlight/50 text-primary text-xs uppercase tracking-wider font-bold border-b border-border">
        {children}
    </thead>
);

const TableRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <tr className="border-b border-border/50 last:border-0 hover:bg-white/5 transition-colors group">
        {children}
    </tr>
);

const TableCell: React.FC<{ children: React.ReactNode, isHeader?: boolean }> = ({ children, isHeader }) => {
    if (isHeader) {
        return <th className="px-4 py-3 text-xs font-bold text-secondary">{children}</th>;
    }
    return <td className="px-4 py-3 text-[14px] text-primary/90 leading-normal">{children}</td>;
};

interface DocumentRendererProps {
  content: string;
}

const DocumentRenderer: React.FC<DocumentRendererProps> = ({ content }) => {
  return (
    <div className="prose prose-invert max-w-none 
       
       /* --- Base Typography --- 
          Size: 16px (text-base) 
          Line Height: 1.75 (leading-7) -> Clean, readable, not too loose.
          Paragraph Spacing: mb-5 (1.25rem) -> Distinct but connected.
       */
       prose-p:text-base prose-p:leading-7 prose-p:text-primary prose-p:mb-5 prose-p:font-normal
       
       /* --- Headings --- 
          Structure: Bold, Display Font, Monochrome.
          Spacing: 
            - Top margin creates the 'section break' feel.
            - Bottom margin (mb-4 = 1rem) creates the '1.5 space' feel relative to text flow.
       */
       prose-headings:font-display prose-headings:font-bold prose-headings:text-primary prose-headings:scroll-mt-20
       
       /* H1: Primary Title */
       prose-h1:text-3xl prose-h1:mt-10 prose-h1:mb-6 prose-h1:pb-3 prose-h1:border-b prose-h1:border-border/60 prose-h1:tracking-tight
       
       /* H2: Secondary Section */
       prose-h2:text-xl prose-h2:mt-9 prose-h2:mb-4 prose-h2:font-semibold
       
       /* H3: Subsection */
       prose-h3:text-lg prose-h3:mt-7 prose-h3:mb-3 prose-h3:font-medium
       
       /* --- Lists --- 
          Tightened vertical rhythm for lists. 
       */
       prose-ul:my-5 prose-ul:list-none prose-ul:pl-0
       prose-ol:my-5 prose-ol:list-decimal prose-ol:pl-5 prose-ol:marker:text-primary/70 prose-ol:marker:font-medium
       prose-li:text-base prose-li:leading-7 prose-li:text-primary prose-li:my-1.5
       
       /* --- Inline Elements --- */
       prose-strong:text-primary prose-strong:font-bold prose-strong:bg-surface_highlight/50 prose-strong:px-1 prose-strong:rounded-sm
       prose-a:text-primary prose-a:underline prose-a:decoration-border hover:prose-a:decoration-primary prose-a:font-medium prose-a:underline-offset-4 prose-a:transition-all
       
       /* --- dividers --- */
       prose-hr:border-border prose-hr:my-10
       
       font-sans"
    >
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                code(props) {
                    const { children, className, node, ...rest } = props;
                    const match = /language-(\w+)/.exec(className || '');
                    const isBlock = match || String(children).includes('\n');
                    if (isBlock) {
                        return (
                            <CodeBlock 
                                language={match ? match[1] : ''} 
                                value={String(children).replace(/\n$/, '')} 
                            />
                        );
                    }
                    // Inline code
                    return (
                        <code className="bg-surface_highlight/80 text-primary rounded px-1.5 py-0.5 text-[0.85em] font-mono border border-border/50 font-medium align-middle" {...rest}>
                            {children}
                        </code>
                    );
                },
                // Blockquotes -> InfoBox
                blockquote({ children }) {
                    return <InfoBox>{children}</InfoBox>;
                },
                // Lists
                ul({ children }) {
                    return <ul className="my-5 space-y-2">{children}</ul>;
                },
                ol({ children }) {
                  return <ol className="my-5 list-decimal pl-5 space-y-2 marker:text-primary/70 marker:font-semibold">{children}</ol>;
                },
                li({ children }) {
                    return (
                       <li className="relative pl-6 text-base leading-7 text-primary">
                          {children}
                       </li>
                    );
                },
                // Tables
                table({ children }) { return <Table>{children}</Table>; },
                thead({ children }) { return <TableHead>{children}</TableHead>; },
                tr({ children }) { return <TableRow>{children}</TableRow>; },
                th({ children }) { return <TableCell isHeader>{children}</TableCell>; },
                td({ children }) { return <TableCell>{children}</TableCell>; },
                // Pre
                pre({ children }) { return <>{children}</>; }
            }}
        >
            {content}
        </ReactMarkdown>
        
        {/* CSS Override for Custom Bullets (Monochrome Dot) */}
        <style>{`
          .prose ul > li {
            position: relative;
            padding-left: 1.5em; /* Space for bullet */
            list-style: none;
          }
          .prose ul > li::before {
            content: "•";
            position: absolute;
            left: 0.1em;
            color: var(--text-primary);
            font-weight: bold;
            font-size: 1.1em;
            line-height: 1.75; /* Match leading-7 */
            opacity: 0.7;
          }
          .prose ol > li {
            padding-left: 0.5em; 
          }
        `}</style>
    </div>
  );
};

export default DocumentRenderer;