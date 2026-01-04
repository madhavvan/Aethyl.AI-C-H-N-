
import React, { useState, useEffect } from 'react';

const ThinkingIndicator: React.FC = () => {
  const [step, setStep] = useState(0);
  const steps = [
    "Analyzing query...",
    "Searching knowledge base...",
    "Processing information...",
    "Synthesizing response...",
    "Refining output..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % steps.length);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500 mb-8 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="relative w-6 h-6 flex items-center justify-center">
            <div className="absolute inset-0 border-2 border-aether-accent/30 rounded-full animate-spin-slow"></div>
            <div className="absolute inset-1 border border-aether-accent rounded-full animate-ping"></div>
            <div className="w-2 h-2 bg-aether-accent rounded-full shadow-[0_0_10px_#00f0ff]"></div>
        </div>
        <span className="text-aether-accent font-display tracking-widest text-sm animate-pulse">
            PROCESSING
        </span>
      </div>
      
      <div className="pl-9">
         <div className="text-aether-muted text-sm font-mono h-6 overflow-hidden">
            <div key={step} className="animate-in slide-in-from-bottom-2 fade-in duration-300">
               {">"} {steps[step]}
            </div>
         </div>
         <div className="mt-2 flex gap-1">
            <div className="h-1 w-8 bg-aether-accent/50 rounded animate-pulse"></div>
            <div className="h-1 w-12 bg-aether-accent/30 rounded animate-pulse delay-75"></div>
            <div className="h-1 w-4 bg-aether-accent/20 rounded animate-pulse delay-150"></div>
         </div>
      </div>
    </div>
  );
};

export default ThinkingIndicator;
