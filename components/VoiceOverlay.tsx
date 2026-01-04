import React from 'react';

interface VoiceOverlayProps {
  isActive: boolean;
  onClose: () => void;
  amplitude: number; // 0 to 1
}

const VoiceOverlay: React.FC<VoiceOverlayProps> = ({ isActive, onClose, amplitude }) => {
  if (!isActive) return null;

  // Amplify the signal for visual impact
  const visualAmp = Math.min(amplitude * 6, 1.5);
  
  // Dynamic scale calculations
  const coreScale = 1 + visualAmp * 0.5;
  const ring1Scale = 1 + visualAmp * 1.2;
  const ring2Scale = 1 + visualAmp * 1.8;
  const ring3Scale = 1 + visualAmp * 2.5;

  const isLoud = visualAmp > 0.3;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center animate-in fade-in duration-300">
      
      {/* Close Button */}
      <button 
        onClick={onClose}
        className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all hover:rotate-90 group z-20"
      >
        <i className="fa-solid fa-xmark text-xl group-hover:text-aether-accent"></i>
      </button>

      {/* Header Indicator */}
      <div className="absolute top-24 flex flex-col items-center animate-in slide-in-from-top-4 duration-700">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-aether-accent/5 border border-aether-accent/20 mb-6 shadow-[0_0_15px_rgba(0,240,255,0.1)]">
          <div className={`w-2 h-2 rounded-full ${isLoud ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-green-500 shadow-[0_0_10px_lime]'} transition-colors duration-200`}></div>
          <span className="text-xs font-mono font-bold text-aether-accent tracking-[0.2em] uppercase">
            Neural Link Active
          </span>
        </div>
        <h2 className="text-5xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500 tracking-tighter drop-shadow-2xl">
          LISTENING
        </h2>
      </div>

      {/* Main Visualizer Orb */}
      <div className="relative w-[500px] h-[500px] flex items-center justify-center">
        
        {/* Background Atmosphere / Noise */}
        <div className={`absolute inset-0 bg-aether-accent/5 rounded-full blur-[120px] transition-all duration-300 ${isLoud ? 'bg-purple-600/10' : ''}`}></div>

        {/* Dynamic Rings */}
        
        {/* Outer Ring - Faint, Large expansion */}
        <div 
          className="absolute inset-0 border border-aether-accent/5 rounded-full transition-transform duration-100 ease-out"
          style={{ 
            transform: `scale(${ring3Scale})`,
            opacity: Math.max(0, 0.5 - visualAmp) 
          }}
        ></div>

        {/* Mid Ring 2 */}
        <div 
          className="absolute inset-[100px] border border-aether-accent/10 rounded-full transition-transform duration-100 ease-out"
          style={{ 
            transform: `scale(${ring2Scale})`,
            opacity: Math.max(0, 0.6 - visualAmp)
          }}
        ></div>

        {/* Mid Ring 1 */}
        <div 
          className="absolute inset-[150px] border border-aether-accent/30 rounded-full transition-transform duration-75 ease-out shadow-[0_0_30px_rgba(0,240,255,0.1)]"
          style={{ 
            transform: `scale(${ring1Scale})`,
            borderColor: isLoud ? 'rgba(192, 132, 252, 0.4)' : 'rgba(56, 189, 248, 0.3)'
          }}
        ></div>

        {/* Core Ring */}
        <div 
          className="absolute inset-[190px] border-2 border-aether-accent rounded-full transition-transform duration-75 ease-out"
          style={{ transform: `scale(${coreScale * 1.1})` }}
        ></div>

        {/* Central Orb */}
        <div 
          className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(0,240,255,0.4)] transition-all duration-100 z-10
            ${isLoud ? 'bg-gradient-to-br from-purple-600 to-aether-accent' : 'bg-gradient-to-br from-aether-accent to-blue-600'}
          `}
          style={{ transform: `scale(${coreScale})` }}
        >
          <i className={`fa-solid fa-microphone text-white text-3xl transition-transform duration-100 ${isLoud ? 'scale-125' : 'scale-100'}`}></i>
          
          {/* Inner Glint */}
          <div className="absolute top-2 left-4 w-6 h-3 bg-white/20 rounded-full rotate-[-45deg] blur-[2px]"></div>
        </div>
        
        {/* Orbiting Particles */}
        <div className="absolute inset-0 animate-[spin_12s_linear_infinite] opacity-40 pointer-events-none">
           <div className="absolute top-[10%] left-1/2 w-1.5 h-1.5 bg-white rounded-full blur-[0.5px] shadow-[0_0_10px_white]"></div>
        </div>
        <div className="absolute inset-[15%] animate-[spin_8s_linear_infinite_reverse] opacity-30 pointer-events-none">
           <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-aether-accent rounded-full blur-[1px]"></div>
        </div>

      </div>

      {/* Pseudo-Waveform Visualization */}
      <div className="absolute bottom-32 flex items-end justify-center gap-1.5 h-24">
         {[...Array(15)].map((_, i) => {
            // Calculate height based on amplitude and position (bell curve shape)
            const center = 7;
            const dist = Math.abs(i - center);
            const baseHeight = 4;
            // The bars near center react more to amplitude
            const sensitivity = Math.max(0.1, 1 - dist / 8); 
            // Add some noise so it looks organic
            const noise = 0.8 + Math.random() * 0.4;
            
            const height = baseHeight + (amplitude * 300 * sensitivity * noise);
            
            return (
               <div 
                 key={i}
                 className={`w-1.5 rounded-full transition-all duration-75 ${isLoud ? 'bg-purple-400' : 'bg-aether-accent'}`}
                 style={{ 
                   height: `${Math.min(height, 80)}px`,
                   opacity: 0.3 + (amplitude * sensitivity)
                 }}
               ></div>
            );
         })}
      </div>

      <div className="absolute bottom-12 text-slate-500 font-mono text-xs tracking-[0.2em] animate-pulse">
        PROCESSING AUDIO STREAM INPUT...
      </div>

    </div>
  );
};

export default VoiceOverlay;