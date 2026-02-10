
import React, { useEffect, useState } from 'react';

interface TitleScreenProps {
  onStart: () => void;
}

const TitleScreen: React.FC<TitleScreenProps> = ({ onStart }) => {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowPrompt(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Gamepad & Keyboard listener
  useEffect(() => {
    let reqId: number;
    let triggered = false;

    const handleKeyDown = (e: KeyboardEvent) => {
        if (!triggered && (e.key === 'Enter' || e.code === 'Space')) {
            triggered = true;
            onStart();
        }
    };
    
    window.addEventListener('keydown', handleKeyDown);

    const pollGamepad = () => {
        if (triggered) return;
        
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gp = gamepads[0];
        
        if (gp) {
            // Button 9 is typically Start, Button 0 is typically 'A' / Cross
            if (gp.buttons[9]?.pressed || gp.buttons[0]?.pressed) {
                triggered = true;
                onStart();
                return;
            }
        }
        
        reqId = requestAnimationFrame(pollGamepad);
    };
    
    reqId = requestAnimationFrame(pollGamepad);

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        cancelAnimationFrame(reqId);
    };
  }, [onStart]);

  return (
    <div 
      className="h-screen w-screen bg-[#020617] flex flex-col items-center justify-center cursor-pointer overflow-hidden relative"
      onClick={onStart}
    >
      {/* Background FX */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle,rgba(236,72,153,0.15)_0%,transparent_70%)] animate-pulse" />
        <div className="absolute top-0 left-0 w-full h-full opacity-20" 
             style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      <div className="relative z-10 flex flex-col items-center animate-pop-in">
        <div className="text-[16vw] font-black italic tracking-tighter leading-none mb-0 flex flex-col items-center select-none">
          <span className="text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]">DJMIX</span>
          <span className="text-pink-500 -mt-[5vw] drop-shadow-[0_0_60px_rgba(236,72,153,0.8)]">LOVE V</span>
        </div>
        
        <div className="mt-12 flex flex-col items-center">
          <div className="h-1.5 w-64 bg-gradient-to-r from-transparent via-cyan-500 to-transparent mb-6" />
          <div className="text-[14px] font-black tracking-[1.2em] text-cyan-400 uppercase animate-pulse">Sync Interface Active</div>
          <div className="h-1.5 w-64 bg-gradient-to-r from-transparent via-cyan-500 to-transparent mt-6" />
        </div>
      </div>

      {showPrompt && (
        <div className="absolute bottom-24 flex flex-col items-center gap-6 animate-fade-in">
          <div className="text-white font-black tracking-[0.6em] uppercase animate-pulse text-2xl text-center">
            Tap or Press START to Synchronize
          </div>
          <div className="flex gap-4">
              <div className="text-[10px] text-pink-500 font-black uppercase tracking-[0.3em] bg-pink-500/10 px-4 py-2 rounded-full border border-pink-500/20">
                Protocol: RHYTHM_v5
              </div>
              <div className="text-[10px] text-cyan-500 font-black uppercase tracking-[0.3em] bg-cyan-500/10 px-4 py-2 rounded-full border border-cyan-500/20">
                Connection: SECURE
              </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-10 w-full flex justify-between px-16 opacity-40">
        <div className="text-[11px] text-gray-400 font-black tracking-[0.4em]">VER. 5.1.0_PRO_SYNC</div>
        <div className="text-[11px] text-gray-400 font-black tracking-[0.4em]">© 2025 NEXUS SYSTEMS AD</div>
      </div>

      {/* Aesthetic scanline effect */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] z-50 bg-[length:100%_4px,3px_100%]" />
    </div>
  );
};

export default TitleScreen;
