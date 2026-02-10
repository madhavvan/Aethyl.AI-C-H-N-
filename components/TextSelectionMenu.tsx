import React, { useEffect, useState, useRef } from 'react';

interface TextSelectionMenuProps {
  onQuote: (text: string) => void;
}

const TextSelectionMenu: React.FC<TextSelectionMenuProps> = ({ onQuote }) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      
      // If no selection or empty
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        // Only hide if we aren't clicking inside the menu itself
        // (This check is handled by onMouseDown on the menu itself)
        setVisible(false);
        return;
      }

      const text = selection.toString().trim();
      // Ensure we are inside a message content area (roughly)
      // For simplicity, we just check if text is valid. 
      // In a strict app, we'd check if anchorNode is child of a message div.

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Calculate position (centered above selection)
      setPosition({
        top: rect.top - 45, // 45px above
        left: rect.left + (rect.width / 2)
      });
      setSelectedText(text);
      setVisible(true);
    };

    // We use mouseup to detect end of selection
    document.addEventListener('mouseup', handleSelectionChange);
    document.addEventListener('keyup', handleSelectionChange); // For keyboard selection

    // Hide on scroll to prevent floating weirdness
    document.addEventListener('scroll', () => setVisible(false), true);

    return () => {
      document.removeEventListener('mouseup', handleSelectionChange);
      document.removeEventListener('keyup', handleSelectionChange);
      document.removeEventListener('scroll', () => setVisible(false), true);
    };
  }, []);

  const handleAddQuote = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (selectedText) {
      onQuote(selectedText);
      setVisible(false);
      window.getSelection()?.removeAllRanges();
    }
  };

  if (!visible) return null;

  return (
    <div 
      ref={menuRef}
      className="fixed z-50 animate-in fade-in zoom-in-95 duration-150"
      style={{ top: position.top, left: position.left, transform: 'translateX(-50%)' }}
      onMouseDown={(e) => e.stopPropagation()} // Prevent clearing selection when clicking menu
    >
      <button 
        onClick={handleAddQuote}
        className="flex items-center gap-2 bg-surface_highlight border border-border text-primary px-3 py-1.5 rounded-full shadow-xl hover:bg-primary hover:text-background transition-colors text-sm font-medium whitespace-nowrap"
      >
        <i className="fa-solid fa-quote-right"></i>
        <span>Ask Hyperion</span>
        <span className="text-[10px] opacity-60 border-l border-current pl-2 ml-1">Add to Chat</span>
      </button>
      {/* Down arrow pointer */}
      <div className="w-2 h-2 bg-surface_highlight border-r border-b border-border rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
    </div>
  );
};

export default TextSelectionMenu;