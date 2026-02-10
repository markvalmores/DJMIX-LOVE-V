
import React, { useState, useEffect, useRef } from 'react';
import { GameMode, PlayerProfile, Friend, ChatMessage } from '../types';
import { DEFAULT_AVATARS, setAvatar, setUsername, DEFAULT_WALLPAPER } from '../services/playerService';
import { generateAiAvatar, generateChatReply } from '../services/geminiService';
import { getFriends, toggleFollow } from '../services/socialService';

interface MainMenuProps {
  onSelectMode: (mode: GameMode) => void;
  profile: PlayerProfile;
}

const MainMenu: React.FC<MainMenuProps> = ({ onSelectMode, profile: initialProfile }) => {
  const [profile, setProfile] = useState(initialProfile);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Social & Chat State
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Chat History mapped by friend ID (or 'global' for global chat)
  const [chatHistories, setChatHistories] = useState<Record<string, ChatMessage[]>>({
      'global': [{ id: 'init', sender: 'AI', text: 'Yo! Neon here. Ready to sync up? Challenge me in Versus mode!', timestamp: Date.now() }]
  });
  
  const [activeChatId, setActiveChatId] = useState<string>('global'); // 'global' or friendId
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      setFriends(getFriends());
  }, []);

  useEffect(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistories, activeChatId, showSocialModal]);

  // Determine current wallpaper
  const equippedWallpaperItem = profile.inventory.find(i => i.id === profile.equipped.wallpaperId);
  const currentWallpaper = equippedWallpaperItem ? equippedWallpaperItem.image : DEFAULT_WALLPAPER;

  const filteredFriends = friends.filter(f => f.username.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleSetAvatar = (url: string) => {
    const updated = setAvatar(url);
    setProfile(updated);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          handleSetAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateAi = async () => {
    setIsGenerating(true);
    try {
        const url = await generateAiAvatar();
        handleSetAvatar(url);
    } catch (e) {
        console.error(e);
    } finally {
        setIsGenerating(false);
    }
  };

  const handleSendChat = async () => {
      if (!chatInput.trim() || isChatting) return;
      
      const userMsg: ChatMessage = { id: Date.now().toString(), sender: 'USER', text: chatInput, timestamp: Date.now() };
      
      setChatHistories(prev => ({
          ...prev,
          [activeChatId]: [...(prev[activeChatId] || []), userMsg]
      }));
      
      setChatInput('');
      setIsChatting(true);

      try {
          // Determine Persona based on activeChatId
          let persona = "Neon (Global AI)";
          if (activeChatId !== 'global') {
              const friend = friends.find(f => f.id === activeChatId);
              if (friend) persona = friend.username;
          }

          const history = chatHistories[activeChatId] || [];
          const replyText = await generateChatReply(history, userMsg.text, persona);
          
          const aiMsg: ChatMessage = { id: (Date.now()+1).toString(), sender: 'AI', text: replyText, timestamp: Date.now() };
          
          setChatHistories(prev => ({
              ...prev,
              [activeChatId]: [...(prev[activeChatId] || []), aiMsg]
          }));
      } catch (e) {
          console.error("Chat error", e);
      } finally {
          setIsChatting(false);
      }
  };

  const handleToggleFollow = (id: string, e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent opening chat when clicking follow
      const updated = toggleFollow(id);
      setFriends(updated);
  };

  return (
    <div className="h-full w-full bg-[#020617] flex flex-col relative overflow-hidden font-mono text-white transition-all duration-1000 select-none">
      {/* Background Wallpaper */}
      <div className="absolute inset-0 z-0">
        <div 
            className="absolute inset-0 bg-cover bg-center transition-all duration-1000 opacity-40 scale-105"
            style={{ backgroundImage: `url(${currentWallpaper})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/50 to-transparent" />
        {/* Animated Grid */}
        <div className="absolute inset-0 opacity-20 mix-blend-overlay" 
             style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>
      
      {/* Header */}
      <div className="relative z-20 p-8 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-6 cursor-pointer group" onClick={() => setShowProfileModal(true)}>
           <div className="relative">
              <div className="absolute inset-0 bg-pink-500 blur-md opacity-30 group-hover:opacity-70 transition-opacity" />
              <div className="relative w-24 h-24 rounded-full border-2 border-white/20 overflow-hidden shadow-2xl">
                <img src={profile.avatar} className="w-full h-full object-cover" />
              </div>
              <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 border-4 border-black rounded-full" />
           </div>
           <div>
             <div className="text-4xl font-black italic tracking-tighter uppercase group-hover:text-pink-500 transition-colors drop-shadow-md">{profile.username}</div>
             <div className="text-[12px] font-black text-yellow-500 tracking-[0.3em] bg-black/40 px-2 py-1 rounded inline-block mt-1">{profile.credits.toLocaleString()} CP // ONLINE</div>
           </div>
        </div>

        <button 
            onClick={() => setShowSocialModal(true)}
            className="bg-black/40 hover:bg-black/60 border border-white/10 p-4 rounded-2xl flex items-center gap-4 transition-all hover:scale-105"
        >
            <div className="relative">
                <div className="text-2xl">💬</div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            </div>
            <div className="text-left hidden md:block">
                <div className="font-bold text-sm">SOCIAL HUB</div>
                <div className="text-[10px] text-gray-400">{friends.filter(f => f.status === 'ONLINE').length} FRIENDS ONLINE</div>
            </div>
        </button>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 gap-8 max-w-6xl mx-auto w-full">
        
        {/* Main Play Button */}
        <button 
          onClick={() => onSelectMode(GameMode.RHYTHM)}
          className="group relative w-full max-w-4xl h-96 bg-black/40 backdrop-blur-sm rounded-[4rem] border-2 border-white/10 overflow-hidden transition-all hover:scale-[1.02] hover:border-pink-500 flex flex-col items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.5)] hover:shadow-[0_0_80px_rgba(236,72,153,0.3)] active:scale-95"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-pink-600/20 via-transparent to-cyan-600/20 opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
          
          <div className="relative z-10 flex flex-col items-center">
            <h2 className="text-[8rem] font-black italic tracking-tighter leading-none mb-4 drop-shadow-2xl">
                <span className="text-white">START</span> <span className="text-pink-500">SYNC</span>
            </h2>
            <div className="bg-white text-black px-12 py-4 rounded-full font-black text-2xl tracking-[0.2em] uppercase group-hover:bg-pink-500 group-hover:text-white transition-colors shadow-lg">
                Enter Rhythm Interface
            </div>
          </div>
        </button>

        {/* Shop Button */}
        <button onClick={() => onSelectMode(GameMode.SHOP)} className="group relative bg-black/40 hover:bg-black/60 backdrop-blur-md px-20 py-8 rounded-3xl border border-white/10 hover:border-cyan-500 transition-all font-black flex items-center gap-6 shadow-xl active:scale-95">
             <div className="text-4xl group-hover:rotate-12 transition-transform">💎</div> 
             <div className="flex flex-col text-left">
                <span className="text-2xl text-white italic">NEXUS SHOP</span>
                <span className="text-[10px] text-cyan-400 tracking-widest uppercase">Customize Gear & Avatars</span>
             </div>
        </button>

      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-8 animate-fade-in">
           <div className="bg-slate-900 w-full max-w-2xl rounded-[3rem] border border-white/10 overflow-hidden flex flex-col max-h-[90vh] shadow-[0_0_100px_rgba(0,0,0,0.8)]">
              <div className="p-10 border-b border-white/5 flex justify-between items-center bg-slate-950">
                 <h3 className="text-4xl font-black italic tracking-tighter text-white">PILOT IDENTITY</h3>
                 <button onClick={() => setShowProfileModal(false)} className="bg-white/5 hover:bg-white/10 w-12 h-12 rounded-full flex items-center justify-center text-3xl font-thin transition-all">×</button>
              </div>
              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-900">
                 <div className="mb-10">
                    <label className="text-[10px] font-black text-pink-500 tracking-[0.4em] block mb-4 uppercase">Sync Codename</label>
                    <input 
                        type="text" 
                        defaultValue={profile.username}
                        onBlur={(e) => { const updated = setUsername(e.target.value); setProfile(updated); }}
                        className="bg-black/50 border border-white/10 w-full p-5 rounded-2xl font-black text-xl focus:border-pink-500 outline-none transition-all text-white"
                        placeholder="ENTER PILOT NAME..."
                    />
                 </div>
                 
                 <div className="mb-8">
                     <label className="text-[10px] font-black text-cyan-500 tracking-[0.4em] block mb-4 uppercase">Upload Custom Identity</label>
                     <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-white/20 rounded-2xl cursor-pointer hover:border-cyan-500 hover:bg-cyan-500/5 transition-all">
                        <span className="text-gray-400 font-bold uppercase tracking-widest text-sm">Tap to Upload (JPG/PNG)</span>
                        <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={handleFileUpload} />
                     </label>
                 </div>

                 <label className="text-[10px] font-black text-cyan-500 tracking-[0.4em] block mb-4 uppercase">Standard Avatars</label>
                 <div className="grid grid-cols-5 gap-4 mb-10">
                    {DEFAULT_AVATARS.map((url, i) => (
                        <div key={i} onClick={() => handleSetAvatar(url)} className={`aspect-square rounded-2xl overflow-hidden border-2 cursor-pointer transition-all ${profile.avatar === url ? 'border-pink-500 scale-105 shadow-[0_0_20px_rgba(236,72,153,0.3)]' : 'border-white/5 grayscale hover:grayscale-0'}`}>
                            <img src={url} className="w-full h-full object-cover" />
                        </div>
                    ))}
                 </div>

                 <button 
                    onClick={handleGenerateAi}
                    disabled={isGenerating}
                    className="w-full group relative bg-gradient-to-r from-pink-600 to-indigo-600 p-6 rounded-3xl font-black text-2xl hover:scale-[1.02] transition-all disabled:opacity-50 overflow-hidden shadow-lg"
                 >
                    <span className="relative z-10">{isGenerating ? 'NEURAL MAPPING...' : 'GENERATE AI AVATAR'}</span>
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12" />
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Social Hub Modal */}
      {showSocialModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-fade-in">
           <div className="bg-slate-950 w-full max-w-5xl h-[85vh] rounded-[2rem] border border-white/10 overflow-hidden flex shadow-2xl">
              {/* Friends List Sidebar */}
              <div className="w-80 border-r border-white/5 bg-slate-900 flex flex-col">
                  <div className="p-6 border-b border-white/5">
                      <h3 className="font-black italic text-xl">NETWORK</h3>
                      <div className="text-xs text-gray-500 uppercase tracking-widest mt-1 mb-4">Friends & Rivals</div>
                      
                      {/* Search */}
                      <input 
                        type="text" 
                        placeholder="SEARCH PILOTS..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white focus:border-pink-500 outline-none transition-colors"
                      />
                  </div>
                  
                  {/* Global Chat Toggle */}
                  <div 
                      onClick={() => setActiveChatId('global')}
                      className={`p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors flex items-center gap-3 ${activeChatId === 'global' ? 'bg-cyan-900/20 border-l-4 border-l-cyan-500' : ''}`}
                  >
                      <div className="w-10 h-10 rounded-full bg-cyan-600 flex items-center justify-center text-lg font-black shadow-[0_0_10px_rgba(6,182,212,0.5)]">🌐</div>
                      <div>
                          <div className="font-black text-sm text-cyan-400">GLOBAL LOBBY</div>
                          <div className="text-[10px] text-gray-400">Public Channel</div>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                      {filteredFriends.length === 0 && (
                          <div className="text-center text-gray-600 text-xs py-4">NO PILOTS FOUND</div>
                      )}
                      {filteredFriends.map(friend => (
                          <div 
                              key={friend.id} 
                              onClick={() => setActiveChatId(friend.id)}
                              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${activeChatId === friend.id ? 'bg-white/10 border-pink-500' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                          >
                              <div className="relative">
                                  <img src={friend.avatar} className="w-10 h-10 rounded-full object-cover" />
                                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${friend.status === 'ONLINE' ? 'bg-green-500' : friend.status === 'IN_GAME' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                  <div className="font-bold truncate text-sm">{friend.username}</div>
                                  <div className="text-[10px] text-gray-500">{friend.status}</div>
                              </div>
                              <button 
                                onClick={(e) => handleToggleFollow(friend.id, e)}
                                className={`text-[10px] font-black px-2 py-1 rounded hover:opacity-80 ${friend.isFollowing ? 'bg-pink-600 text-white' : 'bg-slate-800 text-gray-400'}`}
                              >
                                  {friend.isFollowing ? 'FRIEND' : 'ADD'}
                              </button>
                          </div>
                      ))}
                  </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 flex flex-col bg-[#020617] relative">
                  <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
                      <div className="flex items-center gap-3">
                         {activeChatId === 'global' ? (
                             <>
                                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                                <span className="font-black italic text-cyan-400">GLOBAL CHAT // NEON_AI ACTIVE</span>
                             </>
                         ) : (
                             <>
                                <div className={`w-2 h-2 rounded-full ${friends.find(f => f.id === activeChatId)?.status === 'ONLINE' ? 'bg-green-500' : 'bg-gray-500'}`} />
                                <span className="font-black italic text-white">DM // {friends.find(f => f.id === activeChatId)?.username.toUpperCase()}</span>
                             </>
                         )}
                      </div>
                      <button onClick={() => setShowSocialModal(false)} className="text-gray-500 hover:text-white text-2xl">×</button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      {(chatHistories[activeChatId] || []).map(msg => (
                          <div key={msg.id} className={`flex ${msg.sender === 'USER' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[70%] p-4 rounded-2xl ${msg.sender === 'USER' ? 'bg-pink-600 rounded-br-none' : 'bg-slate-800 rounded-bl-none border border-white/10'}`}>
                                  <div className="text-xs font-black opacity-50 mb-1">
                                      {msg.sender === 'USER' ? profile.username : (activeChatId === 'global' ? 'NEON (AI)' : friends.find(f => f.id === activeChatId)?.username)}
                                  </div>
                                  <div className="text-sm font-medium leading-relaxed">{msg.text}</div>
                              </div>
                          </div>
                      ))}
                      {isChatting && (
                           <div className="flex justify-start">
                               <div className="bg-slate-800 p-4 rounded-2xl rounded-bl-none border border-white/10">
                                   <div className="flex gap-1">
                                       <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                                       <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-75" />
                                       <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-150" />
                                   </div>
                               </div>
                           </div>
                      )}
                      <div ref={chatEndRef} />
                  </div>

                  <div className="p-4 bg-slate-900 border-t border-white/5">
                      <div className="flex gap-2">
                          <input 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                            placeholder={`Message ${activeChatId === 'global' ? 'Everyone' : friends.find(f => f.id === activeChatId)?.username}...`}
                            className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 focus:border-pink-500 outline-none transition-colors"
                          />
                          <button onClick={handleSendChat} disabled={isChatting} className="bg-pink-600 hover:bg-pink-500 px-6 py-3 rounded-xl font-black transition-colors disabled:opacity-50">SEND</button>
                      </div>
                  </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default MainMenu;
