
import React from 'react';

const StrategyGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="h-full w-full bg-[#080214] text-white flex flex-col items-center justify-center font-mono p-12">
        <div className="text-6xl mb-8">🧠</div>
        <h2 className="text-4xl font-black italic text-purple-500 mb-4 uppercase">Void Crawler</h2>
        <p className="text-gray-400 max-w-lg text-center mb-12">
            The data fortress is under siege. Deploy your digital units and solve the core encryption.
        </p>
        <div className="bg-purple-900/20 p-8 rounded-3xl border border-purple-500/30 w-full max-w-md text-center">
            <div className="text-sm font-bold text-purple-500 uppercase tracking-widest mb-4">Tactical Map</div>
            <div className="text-xl font-bold mb-6 italic text-white">Sector 7: Encrypted Node</div>
            <button className="w-full bg-purple-600 py-4 rounded-2xl font-black hover:bg-purple-500 transition-all uppercase shadow-[0_0_20px_rgba(147,51,234,0.4)]">DEPLOY UNITS</button>
        </div>
        <button onClick={onBack} className="mt-12 text-gray-500 font-bold hover:text-white transition-colors uppercase tracking-widest">Abort Strategy</button>
    </div>
  );
};

export default StrategyGame;
