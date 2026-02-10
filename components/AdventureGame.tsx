
import React from 'react';

const AdventureGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="h-full w-full bg-[#0f172a] text-white flex flex-col items-center justify-center font-mono p-12">
        <div className="text-6xl mb-8">🗺️</div>
        <h2 className="text-4xl font-black italic text-blue-500 mb-4 uppercase">72 Hours of Adventure</h2>
        <p className="text-gray-400 max-w-lg text-center mb-12">
            The world is ending in 72 hours. You are the last explorer.
            Navigate the wasteland, gather artifacts, and find the portal.
        </p>
        <div className="bg-slate-800 p-8 rounded-3xl border border-white/10 w-full max-w-md text-center">
            <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Current Quest</div>
            <div className="text-xl font-bold mb-6 italic text-white">Find the Blue Sapphire in the Ruined City</div>
            <button className="w-full bg-blue-600 py-4 rounded-2xl font-black hover:bg-blue-500 transition-all uppercase shadow-lg">Begin Exploration</button>
        </div>
        <button onClick={onBack} className="mt-12 text-gray-500 font-bold hover:text-white transition-colors uppercase tracking-widest">Back to Hub</button>
    </div>
  );
};

export default AdventureGame;
