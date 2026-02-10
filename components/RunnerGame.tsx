
import React from 'react';

const RunnerGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="h-full w-full bg-[#020d04] text-white flex flex-col items-center justify-center font-mono p-12">
        <div className="text-6xl mb-8">🏃</div>
        <h2 className="text-4xl font-black italic text-green-500 mb-4 uppercase">Speed Rush</h2>
        <p className="text-gray-400 max-w-lg text-center mb-12">
            The grid is collapsing. Run as fast as you can through the digital lanes.
        </p>
        <div className="bg-green-900/10 p-8 rounded-3xl border border-green-500/20 w-full max-w-md text-center">
            <div className="text-sm font-bold text-green-500 uppercase tracking-widest mb-4">High Score</div>
            <div className="text-xl font-bold mb-6 italic text-white">Current Best: 12,450m</div>
            <button className="w-full bg-green-600 py-4 rounded-2xl font-black hover:bg-green-500 transition-all uppercase">START RUN</button>
        </div>
        <button onClick={onBack} className="mt-12 text-gray-500 font-bold hover:text-white transition-colors uppercase tracking-widest">Exit to Terminal</button>
    </div>
  );
};

export default RunnerGame;
