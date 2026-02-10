

export enum GameMode {
  TITLE = 'TITLE',
  MENU = 'MENU',
  RHYTHM = 'RHYTHM',
  SHOP = 'SHOP'
}

export type NoteType = 'TAP' | 'HOLD';

export interface RhythmNote {
  id: number;
  lane: 0 | 1 | 2 | 3;
  y: number;
  hit: boolean;
  type: NoteType;
  length: number;
  targetTime: number; // Time in ms relative to song start when this note should be hit
  spawnTime: number; // Time in ms when it appeared
}

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  accuracy: number;
  difficulty: string;
  maxCombo: number;
  date: string;
}

export type GachaType = 'GEAR' | 'TILE' | 'PET' | 'WALLPAPER' | 'AVATAR' | 'EFFECT';

export interface GachaItem {
  id: string;
  type: GachaType;
  name: string;
  image: string;
  rarity: 'R' | 'SR' | 'SSR';
}

export interface GameSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  noteSpeed: number;
  gamepadBindings: number[]; // Array of button indices for lanes 0-3
  autoFever: boolean; // Auto-trigger fever when full
  feverKeybind: string; // Keybind for manual fever
  feverGamepadBinding: number; // Gamepad button index for manual fever
}

export interface PlayerProfile {
  credits: number;
  avatar: string;
  username: string;
  keybinds: string[];
  settings: GameSettings;
  inventory: GachaItem[];
  equipped: {
    gearId: string | null;
    tileId: string | null;
    petId: string | null;
    wallpaperId: string | null;
    avatarId: string | null;
    effectId: string | null;
  };
}

export interface Friend {
  id: string;
  username: string;
  avatar: string;
  status: 'ONLINE' | 'OFFLINE' | 'IN_GAME';
  isFollowing: boolean;
  lastSeen: string;
}

export interface ChatMessage {
  id: string;
  sender: 'USER' | 'AI' | 'SYSTEM';
  text: string;
  timestamp: number;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  difficulty: 'EASY' | 'NORMAL' | 'HARD' | 'NEXUS';
  bpm: number;
  duration: number;
  cover: string;
  videoUrl?: string;
}
