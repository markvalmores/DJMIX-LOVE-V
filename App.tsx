
import React, { useState, useEffect } from 'react';
import MainMenu from './components/MainMenu';
import RhythmGame from './components/RhythmGame';
import GachaScreen from './components/GachaScreen';
import TitleScreen from './components/TitleScreen';
import { GameMode, PlayerProfile } from './types';
import { getPlayerProfile } from './services/playerService';

const App: React.FC = () => {
  const [mode, setMode] = useState<GameMode>(GameMode.TITLE);
  const [profile, setProfile] = useState<PlayerProfile>(getPlayerProfile());

  useEffect(() => {
    const interval = setInterval(() => {
      setProfile(getPlayerProfile());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const renderContent = () => {
    switch (mode) {
      case GameMode.TITLE:
        return <TitleScreen onStart={() => setMode(GameMode.MENU)} />;
      case GameMode.MENU:
        return <MainMenu profile={profile} onSelectMode={setMode} />;
      case GameMode.RHYTHM:
        return <RhythmGame onBack={() => setMode(GameMode.MENU)} />;
      case GameMode.SHOP:
        return <GachaScreen onBack={() => setMode(GameMode.MENU)} />;
      default:
        return <MainMenu profile={profile} onSelectMode={setMode} />;
    }
  };

  return (
    <div className="w-full h-screen overflow-hidden bg-black selection:bg-pink-500 selection:text-white">
      {renderContent()}
    </div>
  );
};

export default App;
