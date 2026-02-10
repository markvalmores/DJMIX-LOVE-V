
import React from 'react';

const FightingGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="h-full w-full bg-[#110101] text-white flex flex-col items-center justify-center font-mono p-12">
        <div className="text-6xl mb-8">⚔️</div>
        <h2 className="text-4xl font-black italic text-red-600 mb-4 uppercase">Nexus Arena</h2>
        <p className="text-gray-400 max-w-lg text-center mb-12">
            Enter the virtual arena and face off against the most powerful AI fighters in the galaxy.
        </p>
        <div className="bg-red-900/20 p-8 rounded-3xl border border-red-500/30 w-full max-w-md text-center">
            <div className="text-sm font-bold text-red-500 uppercase tracking-widest mb-4">Ranked Match</div>
            <div className="text-xl font-bold mb-6 italic text-white">Challenger Found: HYPER_VOID</div>
            <button className="w-full bg-red-600 py-4 rounded-2xl font-black hover:bg-red-500 transition-all uppercase shadow-[0_0_20px_rgba(220,38,38,0.4)]">ENTER COMBAT</button>
        </div>
        <button onClick={onBack} className="mt-12 text-gray-500 font-bold hover:text-white transition-colors uppercase tracking-widest">Return to Nexus</button>
    </div>
  );
};

export default FightingGame;
