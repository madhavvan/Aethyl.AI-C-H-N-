import React from 'react';

const ThinkingIndicator: React.FC = () => {
  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 mb-8 max-w-2xl py-4">
      <div className="flex items-center gap-4">
        {/* 3D Spinner Effect */}
        <div className="relative w-10 h-10 perspective-[1000px]">
           <div className="absolute inset-0 border-2 border-primary/20 rounded-lg animate-[spin_3s_linear_infinite] transform-style-3d"></div>
           <div className="absolute inset-2 border-2 border-accent/60 rounded-lg animate-[spin_4s_linear_infinite_reverse] transform-style-3d rotate-45"></div>
           <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-accent rounded-full shadow-[0_0_15px_currentColor] animate-pulse"></div>
           </div>
        </div>
        
        <div className="flex flex-col">
            <span className="text-primary font-display font-bold text-sm tracking-wide">
                HYPERION CORE
            </span>
            <span className="text-accent text-[10px] font-mono tracking-widest animate-pulse">
                PROCESSING REQUEST...
            </span>
        </div>
      </div>
    </div>
  );
};

export default ThinkingIndicator;