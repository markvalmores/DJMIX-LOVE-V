import React, { useState, useEffect, useRef } from 'react';
import { PlayerProfile, GachaType, GachaItem } from '../types';
import { getPlayerProfile, updatePlayerProfile, equipItem, unequipItem, sellItem, addCustomItem } from '../services/playerService';
import { generateGachaSkin } from '../services/geminiService';

const GachaScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [profile, setProfile] = useState<PlayerProfile>(getPlayerProfile());
  const [selectedTab, setSelectedTab] = useState<GachaType>('EFFECT');
  const [isRolling, setIsRolling] = useState(false);
  const [latestPull, setLatestPull] = useState<GachaItem | null>(null);
  
  // Track which item ID is currently pending a "sell" confirmation
  const [sellingId, setSellingId] = useState<string | null>(null);
  const sellTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Poll for profile updates just in case, but operations should update local state
  useEffect(() => { 
      const interval = setInterval(() => {
          setProfile(getPlayerProfile());
      }, 2000);
      return () => {
          clearInterval(interval);
          if (sellTimeoutRef.current) clearTimeout(sellTimeoutRef.current);
      };
  }, []);

  const handleRoll = async () => {
    if (profile.credits < 100) return alert("Insufficient CP!");
    setIsRolling(true);
    setLatestPull(null); 
    setSellingId(null); // Reset selling state on roll
    try {
        const newItem = await generateGachaSkin(selectedTab);
        const updatedProfile = updatePlayerProfile(p => ({ ...p, credits: p.credits - 100, inventory: [...p.inventory, newItem] }));
        setProfile(updatedProfile);
        setLatestPull(newItem);
    } catch (e) { 
        console.error(e); 
    } finally { setIsRolling(false); }
  };

  const handleEquip = (id: string, type: GachaType) => { 
      const updated = equipItem(id, type); 
      setProfile(updated); 
  };

  const handleUnequip = (type: GachaType) => { 
      const updated = unequipItem(type); 
      setProfile(updated); 
  };
  
  const handleSellClick = (id: string) => {
      if (sellingId === id) {
          // Confirmed! Sell the item.
          const updated = sellItem(id);
          setProfile(updated);
          
          // Clear latest pull if it was the sold item
          if (latestPull?.id === id) {
              setLatestPull(null);
          }
          setSellingId(null);
          if (sellTimeoutRef.current) clearTimeout(sellTimeoutRef.current);
      } else {
          // Require confirmation
          setSellingId(id);
          if (sellTimeoutRef.current) clearTimeout(sellTimeoutRef.current);
          
          // Reset confirmation after 3 seconds
          sellTimeoutRef.current = setTimeout(() => {
              setSellingId(null);
          }, 3000);
      }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
              const img = new Image();
              img.src = e.target?.result as string;
              img.onload = () => {
                  // Auto-resize / adjust to standard 256x256 size for performance
                  const canvas = document.createElement('canvas');
                  canvas.width = 256;
                  canvas.height = 256;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                      ctx.drawImage(img, 0, 0, 256, 256);
                      const resized = canvas.toDataURL('image/png');
                      
                      const newItem: GachaItem = {
                          id: `custom_${Date.now()}`,
                          type: selectedTab,
                          name: `Custom ${selectedTab} ${Math.floor(Math.random() * 99)}`,
                          rarity: 'SR', // Custom items default to SR
                          image: resized
                      };
                      
                      const updated = addCustomItem(newItem);
                      setProfile(updated);
                      alert(`Imported ${newItem.name} successfully!`);
                  }
              };
          };
          reader.readAsDataURL(file);
      }
  };

  const inventoryList = profile.inventory.filter(i => i.type === selectedTab);
  const theme = {
      EFFECT: 'border-cyan-500 bg-cyan-900/10 text-cyan-400 button-cyan-600',
      AVATAR: 'border-blue-500 bg-blue-900/10 text-blue-400 button-blue-600',
      TILE: 'border-pink-500 bg-pink-900/10 text-pink-400 button-pink-600',
      WALLPAPER: 'border-yellow-500 bg-yellow-900/10 text-yellow-400 button-yellow-600',
      GEAR: 'border-purple-500 bg-purple-900/10 text-purple-400 button-purple-600',
      PET: 'border-green-500 bg-green-900/10 text-green-400 button-green-600'
  }[selectedTab] || '';
  
  const equippedKey = `${selectedTab.toLowerCase()}Id` as keyof typeof profile.equipped;
  const equippedItemId = profile.equipped[equippedKey];

  return (
    <div className="h-full w-full bg-slate-950 text-white flex flex-col animate-fade-in font-mono">
        <div className="p-6 bg-slate-900 border-b border-white/5 flex justify-between items-center shadow-2xl">
            <button onClick={onBack} className="bg-slate-800 hover:bg-slate-700 px-6 py-2 rounded-xl font-bold active:scale-95 transition-all">EXIT SHOP</button>
            <div className="text-xl font-black italic tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-500">NEXUS GACHA</div>
            <div className="bg-black/50 px-4 py-2 rounded-full border border-yellow-500/50 text-yellow-500 font-bold text-sm">{profile.credits} CP</div>
        </div>

        <div className="flex gap-1 overflow-x-auto px-4 py-2 no-scrollbar bg-slate-900/50">
             {['EFFECT', 'TILE', 'AVATAR', 'GEAR', 'WALLPAPER', 'PET'].map((t) => (
                 <button 
                    key={t}
                    onClick={() => { setSelectedTab(t as GachaType); setLatestPull(null); setSellingId(null); }} 
                    className={`flex-shrink-0 px-6 py-3 rounded-t-2xl font-black text-xs transition-all ${selectedTab === t ? 'bg-slate-800 text-white border-t-2 border-pink-500 translate-y-[2px]' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    {t}
                </button>
             ))}
        </div>

        <div className={`flex-1 flex flex-col md:flex-row p-6 gap-8 overflow-hidden transition-colors border-t border-white/5 ${theme.split(' ')[1]}`}>
            
            {/* Machine */}
            <div className="flex-1 bg-slate-900 rounded-3xl border border-white/5 p-8 flex flex-col items-center justify-center relative shadow-2xl overflow-hidden">
                <div className="text-6xl mb-8 group-hover:scale-110 transition-transform">
                    {selectedTab === 'EFFECT' ? '💫' : selectedTab === 'TILE' ? '💎' : '🎁'}
                </div>

                <div className="w-56 h-72 bg-black rounded-3xl border-2 border-white/10 flex items-center justify-center mb-8 relative overflow-hidden group">
                    {isRolling ? (
                        <div className="animate-shake flex flex-col items-center">
                            <div className="text-6xl mb-4">📦</div>
                            <div className="text-xs font-bold animate-pulse text-pink-400">CONNECTING...</div>
                        </div>
                    ) : latestPull ? (
                        <div className="animate-pop-in w-full h-full relative group">
                            <img src={latestPull.image} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent pointer-events-none" />
                            <div className="absolute bottom-4 w-full text-center pointer-events-none">
                                <div className="text-sm font-black text-white">{latestPull.name}</div>
                                <div className={`text-[10px] font-bold ${latestPull.rarity === 'SSR' ? 'text-yellow-400' : 'text-blue-400'}`}>{latestPull.rarity}</div>
                            </div>
                            
                            {/* Instant Sell Button Overlay */}
                            <div className="absolute top-3 right-3 z-20">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleSellClick(latestPull.id); }}
                                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all shadow-lg border-2 ${sellingId === latestPull.id ? 'bg-red-600 text-white border-red-400 shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-pulse' : 'bg-black/60 backdrop-blur-md text-red-400 border-red-500/50 hover:bg-red-600 hover:text-white hover:border-red-400'}`}
                                    title="Sell immediately"
                                >
                                    {sellingId === latestPull.id ? 'SURE?' : 'SELL (+20 CP)'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-gray-700 font-bold">READY TO SYNC</div>
                    )}
                </div>

                <button onClick={handleRoll} disabled={isRolling || profile.credits < 100} className={`w-full max-w-xs py-5 rounded-2xl font-black text-xl shadow-lg active:scale-95 transition-all disabled:opacity-50 ${selectedTab === 'EFFECT' ? 'bg-cyan-600' : 'bg-pink-600'}`}>
                    {isRolling ? "PULLING..." : "SYNC x1 (100 CP)"}
                </button>
            </div>

            {/* Inventory */}
            <div className="w-full md:w-[480px] bg-slate-900/50 rounded-3xl border border-white/5 flex flex-col overflow-hidden">
                <div className="p-4 bg-slate-800/80 font-black text-xs uppercase tracking-widest text-gray-400 flex justify-between items-center">
                    <span>Collection ({inventoryList.length})</span>
                    <div className="flex items-center gap-2">
                        {equippedItemId && (
                            <button 
                                onClick={() => handleUnequip(selectedTab)}
                                className="bg-red-500/20 hover:bg-red-500/40 text-red-400 px-3 py-1 rounded text-[10px] border border-red-500/30 transition-colors flex items-center gap-1"
                            >
                                <span>✕</span> DEFAULT
                            </button>
                        )}
                        <label className="cursor-pointer bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-[10px] text-white transition-colors border border-white/10 flex items-center gap-2">
                            <span>📤</span> UPLOAD
                            <input type="file" accept="image/*" className="hidden" onChange={handleImport} />
                        </label>
                    </div>
                </div>
                {/* Changed overflow-y-auto to overflow-y-scroll to guarantee a visible scrollbar track */}
                <div className="flex-1 overflow-y-scroll p-4 space-y-3 custom-scrollbar pr-2">
                    {inventoryList.map(item => {
                        const isEquipped = equippedItemId === item.id;
                        return (
                            <div key={item.id} className={`flex items-center gap-4 p-3 rounded-2xl border transition-all ${isEquipped ? 'bg-pink-500/10 border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.15)]' : 'bg-black/40 border-white/5 hover:bg-black/60'}`}>
                                <div className="w-16 h-16 bg-black rounded-xl overflow-hidden border border-white/10 shrink-0 shadow-inner">
                                    <img src={item.image} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <div className="font-black text-sm truncate text-white drop-shadow-sm">{item.name}</div>
                                    <div className={`text-[10px] font-bold tracking-widest uppercase mt-1 ${item.rarity === 'SSR' ? 'text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]' : item.rarity === 'SR' ? 'text-purple-400' : 'text-blue-400'}`}>{item.rarity} GRADE</div>
                                </div>
                                <div className="flex flex-col gap-2 shrink-0 w-28">
                                    <button 
                                        onClick={() => isEquipped ? handleUnequip(selectedTab) : handleEquip(item.id, item.type)} 
                                        className={`w-full py-2 rounded-lg text-[10px] tracking-wider font-black transition-all ${isEquipped ? 'bg-pink-600 text-white shadow-[0_0_10px_rgba(236,72,153,0.5)] border border-pink-400' : 'bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700 border border-white/10'}`}
                                    >
                                        {isEquipped ? 'EQUIPPED' : 'EQUIP'}
                                    </button>
                                    <button 
                                        onClick={() => handleSellClick(item.id)} 
                                        className={`w-full py-2 rounded-lg text-[10px] tracking-wider font-black transition-all border ${sellingId === item.id ? 'bg-red-600 text-white border-red-400 shadow-[0_0_10px_rgba(220,38,38,0.5)] animate-pulse' : 'bg-red-900/20 text-red-400 hover:bg-red-900/50 hover:text-red-300 border-red-900/30'}`}
                                    >
                                        {sellingId === item.id ? 'SURE?' : 'SELL (+20CP)'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    </div>
  );
};

export default GachaScreen;