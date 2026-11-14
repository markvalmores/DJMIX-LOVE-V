

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

const DMP2_DEFAULT_GEAR_SVG = `data:image/svg+xml;base64,${btoa(`
<svg width="400" height="225" viewBox="0 0 400 225" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="silver" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#475569"/>
      <stop offset="15%" stop-color="#cbd5e1"/>
      <stop offset="50%" stop-color="#94a3b8"/>
      <stop offset="85%" stop-color="#cbd5e1"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>
    <linearGradient id="deck" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#cbd5e1"/>
      <stop offset="50%" stop-color="#64748b"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <rect width="400" height="225" fill="#060913"/>
  <!-- BGA Preview on Right -->
  <rect x="170" y="14" width="216" height="197" rx="8" fill="#0f172a" stroke="#1e293b"/>
  <circle cx="280" cy="112" r="46" fill="#0284c7" fill-opacity="0.18"/>
  <circle cx="280" cy="112" r="28" fill="#38bdf8" fill-opacity="0.22"/>
  <!-- Left-Aligned DMP2 Silver Metallic Gear Chassis -->
  <rect x="16" y="8" width="138" height="209" rx="10" fill="url(#silver)"/>
  <rect x="20" y="12" width="130" height="18" rx="4" fill="#0b1120" stroke="#94a3b8" stroke-width="1"/>
  <text x="85" y="24" font-family="monospace" font-size="7" font-weight="900" fill="#f8fafc" text-anchor="middle">DJMAX PORTABLE 2</text>
  <!-- Left FVR Rail & Right HP Rail -->
  <rect x="20" y="34" width="10" height="130" rx="2" fill="#090d16"/>
  <rect x="22" y="96" width="6" height="64" rx="1" fill="#38bdf8"/>
  <rect x="22" y="76" width="6" height="18" rx="1" fill="#f59e0b"/>
  <rect x="140" y="34" width="10" height="130" rx="2" fill="#090d16"/>
  <rect x="142" y="54" width="6" height="106" rx="1" fill="#22c55e"/>
  <!-- Playfield Track -->
  <rect x="33" y="34" width="104" height="134" fill="#070b16"/>
  <rect x="33" y="34" width="26" height="134" fill="rgba(226,232,240,0.05)"/>
  <rect x="59" y="34" width="26" height="134" fill="rgba(14,165,233,0.1)"/>
  <rect x="85" y="34" width="26" height="134" fill="rgba(14,165,233,0.1)"/>
  <rect x="111" y="34" width="26" height="134" fill="rgba(226,232,240,0.05)"/>
  <line x1="59" y1="34" x2="59" y2="168" stroke="rgba(203,213,225,0.2)"/>
  <line x1="85" y1="34" x2="85" y2="168" stroke="rgba(203,213,225,0.2)"/>
  <line x1="111" y1="34" x2="111" y2="168" stroke="rgba(203,213,225,0.2)"/>
  <!-- DMP2 Notes -->
  <rect x="35" y="68" width="22" height="7" rx="1.5" fill="#f8fafc"/>
  <rect x="61" y="102" width="22" height="7" rx="1.5" fill="#0284c7"/>
  <rect x="87" y="56" width="22" height="7" rx="1.5" fill="#0284c7"/>
  <rect x="113" y="122" width="22" height="7" rx="1.5" fill="#f8fafc"/>
  <!-- Judgment Line & Arrows -->
  <line x1="33" y1="168" x2="137" y2="168" stroke="#38bdf8" stroke-width="3"/>
  <line x1="33" y1="168" x2="137" y2="168" stroke="#ffffff" stroke-width="1"/>
  <!-- Bottom Silver Deck & 3D Keys -->
  <rect x="17" y="170" width="136" height="46" rx="6" fill="url(#deck)"/>
  <rect x="33" y="173" width="104" height="28" rx="3" fill="#090d16"/>
  <rect x="35" y="175" width="22" height="24" rx="2" fill="#cbd5e1"/>
  <rect x="61" y="175" width="22" height="24" rx="2" fill="#0284c7"/>
  <rect x="87" y="175" width="22" height="24" rx="2" fill="#0284c7"/>
  <rect x="113" y="175" width="22" height="24" rx="2" fill="#cbd5e1"/>
  <rect x="24" y="204" width="122" height="9" rx="2" fill="#090d16"/>
  <text x="85" y="211" font-family="monospace" font-size="6" font-weight="900" fill="#cbd5e1" text-anchor="middle">PORTABLE 2</text>
</svg>`)}`;

const DEFAULT_GEAR_SVG = (themeName: string, pColor: string, sColor: string) => `data:image/svg+xml;base64,${btoa(`
<svg width="400" height="225" viewBox="0 0 400 225" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="pgrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="50%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
  </defs>
  <rect width="400" height="225" fill="#020617"/>
  <rect x="140" y="8" width="120" height="209" rx="6" fill="#070a14" stroke="#1e293b" stroke-width="2"/>
  <rect x="140" y="8" width="14" height="209" fill="url(#pgrad)"/>
  <rect x="246" y="8" width="14" height="209" fill="url(#pgrad)"/>
  <line x1="154" y1="8" x2="154" y2="217" stroke="${pColor}" stroke-width="1.5"/>
  <line x1="246" y1="8" x2="246" y2="217" stroke="${sColor}" stroke-width="1.5"/>
  <rect x="154" y="24" width="23" height="152" fill="${pColor}15"/>
  <rect x="177" y="24" width="23" height="152" fill="#ffffff08"/>
  <rect x="200" y="24" width="23" height="152" fill="#ffffff08"/>
  <rect x="223" y="24" width="23" height="152" fill="${sColor}15"/>
  <rect x="156" y="70" width="19" height="7" rx="2" fill="${pColor}"/>
  <rect x="179" y="100" width="19" height="7" rx="2" fill="#fde047"/>
  <rect x="202" y="60" width="19" height="7" rx="2" fill="#fde047"/>
  <rect x="225" y="120" width="19" height="7" rx="2" fill="${sColor}"/>
  <line x1="154" y1="176" x2="246" y2="176" stroke="#ffffff" stroke-width="2"/>
  <rect x="140" y="8" width="120" height="16" fill="#0f172a" stroke="#334155"/>
  <text x="200" y="20" font-family="monospace" font-size="8" font-weight="900" fill="${pColor}" text-anchor="middle">${themeName}</text>
</svg>`)}`;

export const STARTER_GEARS: GachaItem[] = [
  {
    id: 'gear_dmp2_default',
    type: 'GEAR',
    name: 'PORTABLE 2 DEFAULT GEAR',
    rarity: 'SSR',
    image: DMP2_DEFAULT_GEAR_SVG
  },
  {
    id: 'gear_respect_v',
    type: 'GEAR',
    name: 'RESPECT V TITANIUM GEAR',
    rarity: 'SSR',
    image: DEFAULT_GEAR_SVG('RESPECT V', '#00f0ff', '#ec4899')
  },
  {
    id: 'gear_glory_day',
    type: 'GEAR',
    name: 'GLORY DAY NEON GEAR',
    rarity: 'SR',
    image: DEFAULT_GEAR_SVG('GLORY DAY', '#ec4899', '#fde047')
  },
  {
    id: 'gear_technika',
    type: 'GEAR',
    name: 'TECHNIKA CYBER GEAR',
    rarity: 'SR',
    image: DEFAULT_GEAR_SVG('TECHNIKA', '#38bdf8', '#00f0ff')
  }
];

const defaultProfile: PlayerProfile = {
  credits: 1000,
  avatar: DEFAULT_AVATARS[0],
  username: 'SYNC_PILOT_01',
  keybinds: ['d', 'f', 'j', 'k'],
  settings: defaultSettings,
  inventory: [...STARTER_GEARS],
  equipped: {
    gearId: 'gear_dmp2_default',
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
        const currentInventory: GachaItem[] = parsed.inventory || [];
        const hasDmp2 = currentInventory.some(i => i.id === 'gear_dmp2_default');
        const hasAnyGear = currentInventory.some(i => i.type === 'GEAR');
        const mergedInventory = hasAnyGear
            ? (hasDmp2 ? currentInventory : [STARTER_GEARS[0], ...currentInventory])
            : [...STARTER_GEARS, ...currentInventory];

        return { 
            ...defaultProfile, 
            ...parsed,
            inventory: mergedInventory,
            settings: { ...defaultSettings, ...(parsed.settings || {}) },
            equipped: {
                ...defaultProfile.equipped,
                ...(parsed.equipped || {}),
                gearId: parsed.equipped?.gearId || 'gear_dmp2_default'
            }
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
