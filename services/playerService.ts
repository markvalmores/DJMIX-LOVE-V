

import { PlayerProfile, GachaItem, GachaType, GameSettings } from "../types";

const PLAYER_KEY = 'djmix_love_v_player';

export const DEFAULT_AVATARS = [
  "https://images.unsplash.com/photo-1578632292335-df3abbb0d586?auto=format&fit=crop&q=80&w=200", // Anime Girl 1
  "https://images.unsplash.com/photo-1541562232579-512a21360020?auto=format&fit=crop&q=80&w=200", // Nature
  "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=200", // Anime Boy 1
  "https://images.unsplash.com/photo-1580477667995-2b94f01c9516?auto=format&fit=crop&q=80&w=200", // Anime Girl 2
  "https://images.unsplash.com/photo-1551269901-5c5e14c25df7?auto=format&fit=crop&q=80&w=200", // Hacker
  "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=200", // Cyber
  "https://images.unsplash.com/photo-1528319725582-ddc0b6aabc5e?auto=format&fit=crop&q=80&w=200", // Neon
  "https://images.unsplash.com/photo-1559535332-db9971090454?auto=format&fit=crop&q=80&w=200", // Blue
  "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=200", // Gamer
  "https://images.unsplash.com/photo-1560169897-bb334ee5b3e4?auto=format&fit=crop&q=80&w=200"  // Suit
];

export const DEFAULT_WALLPAPER = "https://images.unsplash.com/photo-1516280440614-6697288d5d38?auto=format&fit=crop&q=80&w=1200";

const defaultSettings: GameSettings = {
  masterVolume: 0.8,
  musicVolume: 1.0,
  sfxVolume: 1.0,
  noteSpeed: 1500,
  gamepadBindings: [14, 12, 3, 1], // D-pad Left, D-pad Up, Y, B default
  autoFever: false, // Auto fever set to OFF by default
  feverKeybind: ' ', // Space by default
  feverGamepadBinding: 0 // Button A by default
};

const defaultProfile: PlayerProfile = {
  credits: 1000,
  avatar: DEFAULT_AVATARS[0],
  username: 'SYNC_PILOT_01',
  keybinds: ['d', 'f', 'j', 'k'],
  settings: defaultSettings,
  inventory: [],
  equipped: {
    gearId: null,
    tileId: null,
    petId: null,
    wallpaperId: null,
    avatarId: null,
    effectId: null
  }
};

export const getPlayerProfile = (): PlayerProfile => {
  try {
    const data = localStorage.getItem(PLAYER_KEY);
    if (data) {
        const parsed = JSON.parse(data);
        // Merge default settings in case of old save data
        return { 
            ...defaultProfile, 
            ...parsed,
            settings: { ...defaultSettings, ...(parsed.settings || {}) }
        };
    }
    return { ...defaultProfile };
  } catch (e) {
    return { ...defaultProfile };
  }
};

export const updatePlayerProfile = (updater: (profile: PlayerProfile) => PlayerProfile) => {
  const current = getPlayerProfile();
  const updated = updater(current);
  localStorage.setItem(PLAYER_KEY, JSON.stringify(updated));
  return updated;
};

export const updateSettings = (settings: Partial<GameSettings>) => {
    return updatePlayerProfile(p => ({
        ...p,
        settings: { ...p.settings, ...settings }
    }));
};

export const equipItem = (id: string, type: GachaType) => {
  return updatePlayerProfile(p => {
    const newEquipped = { ...p.equipped };
    let newAvatar = p.avatar;
    const itemKey = `${type.toLowerCase()}Id` as keyof typeof p.equipped;
    (newEquipped as any)[itemKey] = id;
    
    if (type === 'AVATAR') {
        const item = p.inventory.find(i => i.id === id);
        if (item) newAvatar = item.image;
    }
    return { ...p, equipped: newEquipped, avatar: newAvatar };
  });
};

export const unequipItem = (type: GachaType) => {
    return updatePlayerProfile(p => {
        const newEquipped = { ...p.equipped };
        const itemKey = `${type.toLowerCase()}Id` as keyof typeof p.equipped;
        (newEquipped as any)[itemKey] = null;
        
        let newAvatar = p.avatar;
        // Revert to default avatar if unequipping avatar
        if (type === 'AVATAR') {
            newAvatar = DEFAULT_AVATARS[0];
        }

        return { ...p, equipped: newEquipped, avatar: newAvatar };
    });
};

export const sellItem = (itemId: string) => {
  return updatePlayerProfile(p => {
    // 20 CP Fixed Rate
    const value = 20;

    // Check if the item exists
    const itemExists = p.inventory.some(i => i.id === itemId);
    if (!itemExists) return p;

    // Remove from inventory
    const newInventory = p.inventory.filter(i => i.id !== itemId);
    
    // Unequip if currently equipped
    const newEquipped = { ...p.equipped };
    let wasEquipped = false;
    
    Object.keys(newEquipped).forEach(key => {
        if ((newEquipped as any)[key] === itemId) {
            (newEquipped as any)[key] = null;
            wasEquipped = true;
        }
    });

    // Check if we sold the equipped avatar, if so revert to default
    let newAvatar = p.avatar;
    // We check if the sold item was the avatar by ID or if it was the currently active URL
    if (wasEquipped && p.equipped.avatarId === null) {
        // If we just nulled the avatarId, we need to reset the avatar string
        newAvatar = DEFAULT_AVATARS[0];
    }

    return {
      ...p,
      credits: p.credits + value,
      inventory: newInventory,
      equipped: newEquipped,
      avatar: newAvatar
    };
  });
};

export const addCustomItem = (item: GachaItem) => {
    return updatePlayerProfile(p => ({
        ...p,
        inventory: [item, ...p.inventory]
    }));
};

export const setAvatar = (url: string) => updatePlayerProfile(p => ({ ...p, avatar: url }));
export const setUsername = (name: string) => updatePlayerProfile(p => ({ ...p, username: name }));
export const addCredits = (amount: number) => updatePlayerProfile(p => ({ ...p, credits: p.credits + amount }));
export const setKeybinds = (binds: string[]) => updatePlayerProfile(p => ({ ...p, keybinds: binds }));
