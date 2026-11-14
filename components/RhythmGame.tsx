
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RhythmNote, PlayerProfile, Song } from '../types';
import { getPlayerProfile, addCredits, updateSettings, setKeybinds, DEFAULT_AVATARS } from '../services/firebasePlayerService';

enum GameState {
  START_SCREEN = 'START_SCREEN',
  SONG_SELECT = 'SONG_SELECT',
  CONNECTING = 'CONNECTING',
  READY_TO_START = 'READY_TO_START',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  RESULT = 'RESULT',
  GAME_OVER = 'GAME_OVER'
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'SPARK' | 'BURST_IMAGE'; 
}

// Extend RhythmNote locally to handle runtime state for Holds
interface RuntimeNote extends RhythmNote {
    holding?: boolean;
}

const MOCK_SONGS: Song[] = [
    { id: '1', title: 'NEON GENESIS', artist: 'Hatsune X', difficulty: 'NORMAL', bpm: 128, duration: 120, cover: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=200' },
    { id: '2', title: 'CYBERPUNK LOVE', artist: 'Low-Fi Unit', difficulty: 'HARD', bpm: 140, duration: 145, cover: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=200' },
    { id: '3', title: 'VOID STEP', artist: 'Ex-Machina', difficulty: 'NEXUS', bpm: 175, duration: 180, cover: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&q=80&w=200' },
];

const AI_PREFIXES = ['NEO', 'CYBER', 'HYPER', 'VOID', 'ZEN', 'PROTO', 'CORE', 'DATA', 'SYNC', 'NULL', 'OMEGA', 'XENO'];
const AI_SUFFIXES = ['X', 'ZERO', 'UNIT_01', 'GHOST', 'PILOT', 'DRIVE', 'CORE', 'BEAT', 'PULSE', 'WAVE', 'SOUL', 'EDGE'];

const RhythmGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [gameState, setGameState] = useState<GameState>(GameState.START_SCREEN);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [songs, setSongs] = useState<Song[]>(MOCK_SONGS);
  const [isVersus, setIsVersus] = useState(false);
  const [opponent, setOpponent] = useState<{name: string, score: number, avatar: string, isAi: boolean} | null>(null);
  const [matchmakingTime, setMatchmakingTime] = useState(5);
  const [gamepadConnected, setGamepadConnected] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [feverReady, setFeverReady] = useState(false);
  
  // Settings Binding State
  const [bindingTarget, setBindingTarget] = useState<number | 'FEVER' | null>(null);
  const [bindingType, setBindingType] = useState<'KEY' | 'GAMEPAD' | null>(null);
  
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [health, setHealth] = useState(100);
  const [feedback, setFeedback] = useState<{ text: string; color: string; percent: number; scale: number } | null>(null);
  
  // Visual Assets State
  const [assets, setAssets] = useState({
      effect: null as HTMLImageElement | null,
      tile: null as HTMLImageElement | null,
      gear: null as HTMLImageElement | null,
      pet: null as string | null
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // High-Fidelity Audio Mastering Nodes (Dolby Atmos Style Clarity)
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const sfxGainRef = useRef<GainNode | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const notesRef = useRef<RuntimeNote[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const lanePressedRef = useRef<boolean[]>([false, false, false, false]);
  const prevGamepadButtonsRef = useRef<boolean[]>([false, false, false, false]); 
  const prevGamepadFeverButtonRef = useRef<boolean>(false); 
  
  // Time keeping
  const lastNoteTimeRef = useRef(0);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  
  // Game Stats refs (for loop performance)
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const healthRef = useRef(100);
  const totalNotesProcessed = useRef(0);
  const accuracySum = useRef(0);
  const requestRef = useRef<number>(0);

  // Fever State refs
  const feverRef = useRef(0);
  const isFeverActiveRef = useRef(false);
  const feverEndTimeRef = useRef(0);
  const feverReadyRef = useRef(false);

  const [profile, setProfileState] = useState(getPlayerProfile());
  const profileRef = useRef(profile); // Ref to access latest profile inside loops
  const feedbackRef = useRef<{ text: string; color: string; percent: number; scale: number; timestamp: number } | null>(null);

  useEffect(() => {
      if (feedback) {
          feedbackRef.current = { ...feedback, timestamp: performance.now() };
      } else {
          feedbackRef.current = null;
      }
  }, [feedback]);

  useEffect(() => {
      profileRef.current = profile;
      
      // Update Audio Master Nodes based on profile settings
      if (masterGainRef.current) masterGainRef.current.gain.value = profile.settings.masterVolume;
      // Massive 3.0x multiplier to crank up the music track volume heavily
      if (musicGainRef.current) musicGainRef.current.gain.value = profile.settings.musicVolume * 3.0;
      if (sfxGainRef.current) sfxGainRef.current.gain.value = profile.settings.sfxVolume;

      // Ensure raw video plays if Web Audio API hasn't grabbed it yet
      if (videoRef.current && !mediaSourceRef.current) {
          // Fallback if audio routing isn't active yet
          videoRef.current.volume = Math.min(1, profile.settings.masterVolume * profile.settings.musicVolume * 1.5);
      }
  }, [profile.settings.masterVolume, profile.settings.musicVolume, profile.settings.sfxVolume]);

  // Load Equipped Items Assets
  useEffect(() => {
    const loadAssets = async () => {
        const newAssets = { ...assets };
        const { equipped, inventory } = profile;

        const loadImg = (id: string | null): Promise<HTMLImageElement | null> => {
            return new Promise((resolve) => {
                if (!id) return resolve(null);
                const item = inventory.find(i => i.id === id);
                if (!item) return resolve(null);
                const img = new Image();
                img.src = item.image;
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
            });
        };

        const getUrl = (id: string | null) => {
             return inventory.find(i => i.id === id)?.image || null;
        };

        newAssets.effect = await loadImg(equipped.effectId);
        newAssets.tile = await loadImg(equipped.tileId);
        newAssets.gear = await loadImg(equipped.gearId);
        newAssets.pet = getUrl(equipped.petId);

        setAssets(newAssets);
    };
    loadAssets();
  }, [profile.equipped]);
  
  // Gamepad Detection
  useEffect(() => {
      const connectHandler = () => setGamepadConnected(true);
      const disconnectHandler = () => setGamepadConnected(false);
      window.addEventListener("gamepadconnected", connectHandler);
      window.addEventListener("gamepaddisconnected", disconnectHandler);
      return () => {
          window.removeEventListener("gamepadconnected", connectHandler);
          window.removeEventListener("gamepaddisconnected", disconnectHandler);
      };
  }, []);

  const equippedEffect = profile.inventory.find(i => i.id === profile.equipped.effectId);
  const effectColor = equippedEffect?.rarity === 'SSR' ? '#fbbf24' : equippedEffect?.rarity === 'SR' ? '#60a5fa' : '#ec4899';
  
  // 🎶 AUDIO SYSTEM: Dolby Atmos Style Processing Chain
  const initAudioSystem = useCallback(() => {
      if (!audioContextRef.current) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          // Use 48kHz High-Res Sample Rate for crisp playback
          const ctx = new AudioContextClass({ sampleRate: 48000 });
          audioContextRef.current = ctx;

          // Gain Nodes
          masterGainRef.current = ctx.createGain();
          musicGainRef.current = ctx.createGain();
          sfxGainRef.current = ctx.createGain();

          // 🎛️ Mastering Eq: High Shelf for Extreme Crispness & Clarity (Air)
          const eqHigh = ctx.createBiquadFilter();
          eqHigh.type = 'highshelf';
          eqHigh.frequency.value = 5000;
          eqHigh.gain.value = 6; // +6dB massive crispness boost

          // 🎛️ Mastering Eq: Low Shelf for Punchy Bass
          const eqLow = ctx.createBiquadFilter();
          eqLow.type = 'lowshelf';
          eqLow.frequency.value = 120;
          eqLow.gain.value = 3; // +3dB deep bass boost

          // 🗜️ Dynamics Brickwall Limiter: Prevents the 3.0x boosted music from clipping while making it extremely loud
          const compressor = ctx.createDynamicsCompressor();
          compressor.threshold.value = -2;  // Very high threshold, only catches peaks near clipping
          compressor.knee.value = 5;        // Harder knee for limiting
          compressor.ratio.value = 12;      // Hard brickwall limiting ratio
          compressor.attack.value = 0.003;  // Lightning fast attack
          compressor.release.value = 0.05;  // Fast release to keep the body loud

          // Routing: Music -> Massive Gain -> EQ -> Brickwall Limiter -> Master
          musicGainRef.current.connect(eqLow);
          eqLow.connect(eqHigh);
          eqHigh.connect(compressor);
          compressor.connect(masterGainRef.current);

          // Routing: SFX -> Direct to Master
          // By bypassing the compressor, SFX remains 100% crisp and distinct even when the music is cranked to the max!
          sfxGainRef.current.connect(masterGainRef.current);

          // Master -> Speakers
          masterGainRef.current.connect(ctx.destination);
      }

      // Connect Video Element if not connected
      if (videoRef.current && !mediaSourceRef.current) {
          try {
              videoRef.current.crossOrigin = "anonymous";
              mediaSourceRef.current = audioContextRef.current.createMediaElementSource(videoRef.current);
              mediaSourceRef.current.connect(musicGainRef.current!);
              videoRef.current.volume = 1.0; // Let Web Audio API handle volume mix
          } catch (e) {
              console.warn("Audio Context media routing failed, falling back to standard audio.", e);
          }
      }
      
      if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
      }

      // Apply Initial Volumes with massive music boost
      if (masterGainRef.current) masterGainRef.current.gain.value = profileRef.current.settings.masterVolume;
      if (musicGainRef.current) musicGainRef.current.gain.value = profileRef.current.settings.musicVolume * 3.0; // 300% volume pre-limiter
      if (sfxGainRef.current) sfxGainRef.current.gain.value = profileRef.current.settings.sfxVolume;
  }, []);

  const playHitSound = useCallback(() => {
    if (!audioContextRef.current || !sfxGainRef.current) return;
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle'; 
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
    
    // SFX base volume aggressively boosted (1.2) to slice right through the 300% music volume
    gain.gain.setValueAtTime(1.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(sfxGainRef.current); // Connect to dedicated uncompressed SFX bus
    osc.start(t);
    osc.stop(t + 0.1);
  }, []);

  const playFeverSound = useCallback(() => {
    if (!audioContextRef.current || !sfxGainRef.current) return;
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const t = ctx.currentTime;

    // Epic rising arpeggio
    const freqs = [300, 400, 500, 600, 800, 1000, 1200, 1600];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t + i * 0.05);
      
      gain.gain.setValueAtTime(0, t + i * 0.05);
      gain.gain.linearRampToValueAtTime(0.8, t + i * 0.05 + 0.02); // Very loud fever FX
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.5);
      
      osc.connect(gain);
      gain.connect(sfxGainRef.current!); // Connect to dedicated uncompressed SFX bus
      osc.start(t + i * 0.05);
      osc.stop(t + i * 0.05 + 0.5);
    });
  }, []);

  const activateFever = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;
    if (feverRef.current >= 100 && !isFeverActiveRef.current) {
        isFeverActiveRef.current = true;
        const currentTimeMs = performance.now() - startTimeRef.current;
        feverEndTimeRef.current = currentTimeMs + 7000;
        playFeverSound();
        setFeedback({ text: 'FEVER!!', color: '#fbbf24', percent: 100, scale: 1.5 });
        feverReadyRef.current = false;
        setFeverReady(false);
    }
  }, [gameState, playFeverSound]);

  const handleVideoImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const videoUrl = URL.createObjectURL(file);
      const customSong: Song = {
        id: `custom_${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, "").substring(0, 20),
        artist: 'Custom Import',
        difficulty: 'NEXUS',
        bpm: 140, 
        duration: 300, 
        cover: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&q=80&w=200', // Default fallback
        videoUrl: videoUrl
      };
      
      const tempVideo = document.createElement('video');
      tempVideo.muted = true;
      tempVideo.playsInline = true;
      tempVideo.preload = 'metadata';
      
      tempVideo.onloadedmetadata = () => {
        customSong.duration = tempVideo.duration;
        // Seek slightly into the video to avoid black frames at the beginning
        tempVideo.currentTime = Math.min(1, tempVideo.duration * 0.1);
      };

      tempVideo.onseeked = () => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 400; // Generate a nice 400px wide thumbnail
            canvas.height = (tempVideo.videoHeight / tempVideo.videoWidth) * 400;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
                customSong.cover = canvas.toDataURL('image/jpeg', 0.8);
            }
        } catch (e) {
            console.warn("Could not extract thumbnail from video", e);
        }
        setSongs(prev => [customSong, ...prev]);
      };

      tempVideo.onerror = () => {
        // Fallback in case the browser can't seek or read the video properly
        setSongs(prev => [customSong, ...prev]);
      };

      tempVideo.src = videoUrl;
    }
  };

  const handleRemoveSong = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSongs(prev => {
        const s = prev.find(song => song.id === id);
        if (s?.videoUrl) URL.revokeObjectURL(s.videoUrl);
        return prev.filter(song => song.id !== id);
    });
  };

  const createBurst = (x: number, y: number) => {
    if (particlesRef.current.length > 150) particlesRef.current.shift(); // Performance cap
    const isFever = isFeverActiveRef.current;

    particlesRef.current.push({
        id: Math.random(),
        x, y, vx: 0, vy: 0, life: 1.0, maxLife: 1.0,
        color: '#ffffff', size: 100, type: 'BURST_IMAGE'
    });

    const sparkCount = isFever ? 16 : 8;
    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (3 + Math.random() * 5) * (isFever ? 1.5 : 1);
      particlesRef.current.push({
        id: Math.random(),
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.7, maxLife: 0.7,
        color: isFever && Math.random() > 0.5 ? '#fbbf24' : (i % 2 === 0 ? '#ffffff' : effectColor),
        size: (3 + Math.random() * 5) * (isFever ? 1.5 : 1),
        type: 'SPARK'
      });
    }
  };

  const registerHit = (points: number, text: string, ratio: number) => {
       scoreRef.current += Math.floor(points * (1 + comboRef.current * 0.05));
       comboRef.current += 1;
       totalNotesProcessed.current += 1;
       accuracySum.current += ratio;
       healthRef.current = Math.min(100, healthRef.current + 2);

       setScore(scoreRef.current);
       setCombo(comboRef.current);
       setAccuracy(accuracySum.current / totalNotesProcessed.current);
       setHealth(healthRef.current);
       setFeedback({ text, color: effectColor, percent: ratio, scale: 1.5 });
  };

  const registerMiss = () => {
      comboRef.current = 0;
      healthRef.current -= 10;
      totalNotesProcessed.current += 1;
      
      // Fever penalty
      if (!isFeverActiveRef.current) {
          feverRef.current = Math.max(0, feverRef.current - 5);
      }

      setCombo(0);
      setHealth(healthRef.current);
      setAccuracy(accuracySum.current / Math.max(1, totalNotesProcessed.current));
      setFeedback({ text: 'MISS', color: '#ef4444', percent: 0, scale: 1.2 });
      if (healthRef.current <= 0) setGameState(GameState.GAME_OVER);
  };

  // Authentic DJMax Portable 2 default playfield gear metrics (left-aligned on widescreen)
  const computeGearMetrics = (width: number, height: number) => {
      const isWide = width >= 640;
      const gearWidth = isWide
          ? Math.min(440, Math.max(300, width * 0.35))
          : Math.min(400, width - 16);
      const gearX = isWide
          ? Math.max(16, width * 0.025)
          : (width - gearWidth) / 2;
      const railWidth = Math.max(20, Math.min(28, gearWidth * 0.068));
      const playAreaX = gearX + railWidth;
      const playAreaWidth = gearWidth - (railWidth * 2);
      const laneWidth = playAreaWidth / 4;
      const topDeckH = 44;
      const bottomDeckH = 92;
      const hitLineY = height - bottomDeckH - 12;
      return { gearWidth, gearX, railWidth, playAreaX, playAreaWidth, laneWidth, hitLineY, topDeckH, bottomDeckH };
  };

  const handlePress = useCallback((lane: number) => {
     lanePressedRef.current[lane] = true;
     playHitSound();

     if (gameState !== GameState.PLAYING) return;
     
     const currentTime = performance.now() - startTimeRef.current;
     
     const validNotes = notesRef.current.filter(n => n.lane === lane && !n.hit);
     if (validNotes.length === 0) {
         const canvas = canvasRef.current;
         if (canvas) {
             const dpr = Math.min(window.devicePixelRatio || 1, 2);
             const width = canvas.width / dpr;
             const height = canvas.height / dpr;
             const { playAreaX, laneWidth, hitLineY } = computeGearMetrics(width, height);
             createBurst(playAreaX + lane * laneWidth + laneWidth / 2, hitLineY);
         }
         return;
     }

     const note = validNotes.reduce((prev, curr) => 
        Math.abs(curr.targetTime - currentTime) < Math.abs(prev.targetTime - currentTime) ? curr : prev
     );
     
     const timeDiffOrig = Math.abs(note.targetTime - currentTime);
     let timeDiff = timeDiffOrig;
     
     if (timeDiffOrig < 150) {
       const canvas = canvasRef.current;
       if (canvas) {
           const dpr = Math.min(window.devicePixelRatio || 1, 2);
           const width = canvas.width / dpr;
           const height = canvas.height / dpr;
           const { playAreaX, laneWidth, hitLineY } = computeGearMetrics(width, height);
           createBurst(playAreaX + lane * laneWidth + laneWidth / 2, hitLineY);
       }

       if (note.type === 'HOLD') {
           // Start Holding
           note.holding = true;
           setFeedback({ text: 'HOLD', color: '#fbbf24', percent: 100, scale: 1.0 });
       } else {
           // Tap Logic
           let points = 0;
           let text = '';
           let ratio = Math.max(0, (1 - timeDiffOrig / 150) * 100);

           if (isFeverActiveRef.current) {
               timeDiff = Math.max(0, timeDiffOrig - 40); // Forgiving accuracy during fever
               ratio = Math.min(100, ratio + 20); // Boost precision
           }

           if (timeDiff < 40) { points = 300; text = 'PERFECT'; }
           else if (timeDiff < 80) { points = 150; text = 'GREAT'; }
           else if (timeDiff < 120) { points = 100; text = 'NICE'; }
           else { points = 50; text = 'GOOD'; }

           if (isFeverActiveRef.current) {
               points *= 2;
               text = `🔥${text}🔥`;
           } else {
               // Build Fever
               if (text === 'PERFECT') feverRef.current += 5;
               else if (text === 'GREAT') feverRef.current += 3;
               else if (text === 'NICE') feverRef.current += 1;
               
               if (feverRef.current >= 100) {
                   feverRef.current = 100;
                   if (profileRef.current.settings.autoFever === true && !isFeverActiveRef.current) {
                       isFeverActiveRef.current = true;
                       feverEndTimeRef.current = currentTime + 7000;
                       playFeverSound();
                       text = 'FEVER!!';
                   }
               }
           }

           note.hit = true;
           registerHit(points, text, ratio);
       }
     }
  }, [gameState, effectColor, playHitSound, playFeverSound]);

  const pollGamepad = useCallback(() => {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];
    if (!gp) return;

    // Handle Remapping Logic
    if (showSettings && bindingTarget !== null && bindingType === 'GAMEPAD') {
        const pressedIndex = gp.buttons.findIndex(b => b.pressed);
        if (pressedIndex !== -1) {
            if (bindingTarget === 'FEVER') {
                const updated = updateSettings({ feverGamepadBinding: pressedIndex });
                setProfileState(updated);
            } else {
                const newBindings = [...profileRef.current.settings.gamepadBindings];
                newBindings[bindingTarget as number] = pressedIndex;
                const updated = updateSettings({ gamepadBindings: newBindings });
                setProfileState(updated);
            }
            setBindingTarget(null);
            setBindingType(null);
        }
        return; // Don't trigger game inputs while binding
    }

    // Handle Gamepad Fever Trigger
    const feverBtnIdx = profileRef.current.settings.feverGamepadBinding ?? 0;
    const feverPressed = gp.buttons[feverBtnIdx]?.pressed || false;
    if (feverPressed && !prevGamepadFeverButtonRef.current) {
        activateFever();
    }
    prevGamepadFeverButtonRef.current = feverPressed;

    const bindings = profileRef.current.settings.gamepadBindings;
    const laneMappings = [
        gp.buttons[bindings[0]]?.pressed,
        gp.buttons[bindings[1]]?.pressed,
        gp.buttons[bindings[2]]?.pressed,
        gp.buttons[bindings[3]]?.pressed,
    ];

    laneMappings.forEach((isPressed, lane) => {
        if (isPressed && !prevGamepadButtonsRef.current[lane]) {
            handlePress(lane);
        }
        if (!isPressed && prevGamepadButtonsRef.current[lane]) {
            lanePressedRef.current[lane] = false;
        }
        prevGamepadButtonsRef.current[lane] = !!isPressed;
    });

  }, [handlePress, showSettings, bindingTarget, bindingType, activateFever]);

  const update = useCallback((time: number) => {
    if (gameState !== GameState.PLAYING) return;
    
    pollGamepad();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true }); // optimize
    if (!ctx) return;

    const currentTimeMs = time - startTimeRef.current;
    const elapsedSec = currentTimeMs / 1000;

    const noteSpeed = profileRef.current.settings.noteSpeed || 1500;

    if (selectedSong && elapsedSec > selectedSong.duration) {
        setGameState(GameState.RESULT);
        return;
    }

    // Fever Timer Check
    if (isFeverActiveRef.current && currentTimeMs > feverEndTimeRef.current) {
        isFeverActiveRef.current = false;
        feverRef.current = 0;
    }

    // Sync manual fever ready state
    if (feverRef.current >= 100 && !isFeverActiveRef.current && !feverReadyRef.current) {
        feverReadyRef.current = true;
        setFeverReady(true);
    } else if ((feverRef.current < 100 || isFeverActiveRef.current) && feverReadyRef.current) {
        feverReadyRef.current = false;
        setFeverReady(false);
    }

    // High Performance Rendering: Cap DPR at 2
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    
    // Resize only if needed
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) { 
        canvas.width = width * dpr; 
        canvas.height = height * dpr; 
    }
    
    // Clear
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Compute DJMax Portable 2 default gear metrics (left-aligned on widescreen)
    const { gearWidth, gearX, railWidth, playAreaX, playAreaWidth, laneWidth, hitLineY, topDeckH, bottomDeckH } = computeGearMetrics(width, height);
    const gearTop = 10;
    const gearBottom = height - 10;
    const gearHeight = gearBottom - gearTop;
    const trackTop = gearTop + topDeckH;
    const trackHeight = hitLineY - trackTop;

    // 1. Subtle Fullscreen Fever Atmosphere (leaves BGA visible on right)
    if (isFeverActiveRef.current) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const pulse = Math.sin(currentTimeMs / 60) * 0.08 + 0.09;
        const grad = ctx.createLinearGradient(0, height, 0, 0);
        grad.addColorStop(0, `rgba(56, 189, 248, ${pulse + 0.08})`);
        grad.addColorStop(0.5, `rgba(251, 191, 36, ${pulse})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
    }

    // 2. Outer Drop Shadow behind DMP2 Hardware Gear
    ctx.save();
    ctx.shadowColor = isFeverActiveRef.current ? 'rgba(251, 191, 36, 0.55)' : 'rgba(56, 189, 248, 0.35)';
    ctx.shadowBlur = 28;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(gearX, gearTop, gearWidth, gearHeight, 14);
    ctx.fill();
    ctx.restore();

    // 3. Brushed Metallic Silver / Chrome Gear Outer Casing
    const frameGrad = ctx.createLinearGradient(gearX, gearTop, gearX + gearWidth, gearTop);
    frameGrad.addColorStop(0, '#475569');
    frameGrad.addColorStop(0.08, '#cbd5e1');
    frameGrad.addColorStop(0.25, '#94a3b8');
    frameGrad.addColorStop(0.5, '#64748b');
    frameGrad.addColorStop(0.75, '#94a3b8');
    frameGrad.addColorStop(0.92, '#cbd5e1');
    frameGrad.addColorStop(1, '#334155');
    ctx.fillStyle = frameGrad;
    ctx.beginPath();
    ctx.roundRect(gearX, gearTop, gearWidth, gearHeight, 14);
    ctx.fill();

    // Outer metallic specular edge & dark inset border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(gearX + 1, gearTop + 1, gearWidth - 2, gearHeight - 2, 13);
    ctx.stroke();

    // 4. Inner Recessed Playfield Glass Backdrop
    ctx.fillStyle = 'rgba(7, 11, 22, 0.9)';
    ctx.fillRect(playAreaX, trackTop, playAreaWidth, hitLineY - trackTop + 4);

    // Custom / Gacha Gear Skin overlay (only when a custom/gacha gear skin is equipped)
    const activeGearId = profileRef.current.equipped.gearId;
    if (activeGearId && !activeGearId.startsWith('gear_') && assets.gear && assets.gear.complete && assets.gear.naturalWidth !== 0) {
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.drawImage(assets.gear, playAreaX, trackTop, playAreaWidth, hitLineY - trackTop);
        ctx.restore();
    }

    // 5. 4B Lanes (DMP2 Classic Silver-Ice Outer & Electric-Blue Inner)
    for (let i = 0; i < 4; i++) {
        const lx = playAreaX + i * laneWidth;
        const isOuter = (i === 0 || i === 3);
        ctx.fillStyle = isOuter ? 'rgba(226, 232, 240, 0.04)' : 'rgba(14, 165, 233, 0.085)';
        ctx.fillRect(lx, trackTop, laneWidth, hitLineY - trackTop);

        if (i > 0) {
            ctx.fillStyle = 'rgba(203, 213, 225, 0.16)';
            ctx.fillRect(lx - 0.5, trackTop, 1, hitLineY - trackTop);
        }
    }

    // Scrolling subtle horizontal measure grid lines inside track
    const beatMs = (60 / (selectedSong?.bpm || 120)) * 1000;
    const measureOffset = ((currentTimeMs % beatMs) / beatMs) * 72;
    ctx.fillStyle = 'rgba(148, 163, 184, 0.07)';
    for (let gy = trackTop + measureOffset; gy < hitLineY; gy += 72) {
        ctx.fillRect(playAreaX, gy, playAreaWidth, 1);
    }

    // Inner ice-blue track trim lines along left & right edges of playfield
    ctx.fillStyle = isFeverActiveRef.current ? '#fbbf24' : '#38bdf8';
    ctx.fillRect(playAreaX - 1.5, trackTop, 1.5, hitLineY - trackTop);
    ctx.fillRect(playAreaX + playAreaWidth, trackTop, 1.5, hitLineY - trackTop);

    // 6. Clipped Playfield Content (Keybeams + Notes stay cleanly inside the DMP2 Glass Track!)
    ctx.save();
    ctx.beginPath();
    ctx.rect(playAreaX, trackTop, playAreaWidth, hitLineY - trackTop + 12);
    ctx.clip();

    // Key Press Beams (Crisp ice-blue / white vertical glow)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
        if (lanePressedRef.current[i]) {
            const lx = playAreaX + i * laneWidth;
            const centerX = lx + laneWidth / 2;
            const isOuter = (i === 0 || i === 3);
            const beamColor = isFeverActiveRef.current ? '#fbbf24' : (isOuter ? '#e0f2fe' : '#38bdf8');
            const beamGrad = ctx.createLinearGradient(centerX, hitLineY, centerX, hitLineY - 320);
            beamGrad.addColorStop(0, `${beamColor}aa`);
            beamGrad.addColorStop(0.55, `${beamColor}33`);
            beamGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = beamGrad;
            ctx.fillRect(lx + 1, hitLineY - 320, laneWidth - 2, 320);
        }
    }
    ctx.restore();

    // SPAWN LOGIC (Time Based)
    const spawnCutoff = (selectedSong?.duration || 0) * 1000 - 3000;
    const beatInterval = (60 / (selectedSong?.bpm || 120)) * 1000;

    if (currentTimeMs < spawnCutoff && currentTimeMs - lastNoteTimeRef.current > beatInterval) {
      const isHold = Math.random() > 0.8;
      const length = isHold ? Math.min(800, beatInterval * 3) : 0;
      
      notesRef.current.push({ 
        id: Date.now() + Math.random(), 
        lane: Math.floor(Math.random() * 4) as any, 
        y: -100,
        hit: false, 
        type: isHold ? 'HOLD' : 'TAP', 
        length: length,
        spawnTime: currentTimeMs,
        targetTime: currentTimeMs + noteSpeed 
      });
      lastNoteTimeRef.current = currentTimeMs + length;
    }

    // UPDATE & DRAW NOTES (DMP2 Classic Silver-White & Electric Blue)
    ctx.globalCompositeOperation = 'lighter'; 

    notesRef.current = notesRef.current.filter(n => {
      const timeRemaining = n.targetTime - currentTimeMs;
      const progress = 1 - (timeRemaining / noteSpeed);
      let headY = trackTop - 24 + (progress * (hitLineY - trackTop + 24)); 
      n.y = headY;

      // HOLD NOTE LOGIC
      if (n.type === 'HOLD') {
           const tailTimeRemaining = timeRemaining + n.length;
           const tailProgress = 1 - (tailTimeRemaining / noteSpeed);
           const tailY = trackTop - 24 + (tailProgress * (hitLineY - trackTop + 24));

           if (n.holding) {
               if (!lanePressedRef.current[n.lane]) {
                   n.holding = false;
                   n.hit = true;
                   registerMiss();
                   return false; 
               }
               
               if (currentTimeMs >= n.targetTime + n.length) {
                   n.holding = false;
                   n.hit = true;
                   let points = 300;
                   let text = 'COMPLETE';
                   
                   if (isFeverActiveRef.current) {
                       points *= 2;
                       text = '🔥COMPLETE🔥';
                   } else {
                       feverRef.current += 10;
                       if (feverRef.current >= 100) {
                           feverRef.current = 100;
                           if (profileRef.current.settings.autoFever === true && !isFeverActiveRef.current) {
                               isFeverActiveRef.current = true;
                               feverEndTimeRef.current = currentTimeMs + 7000;
                               playFeverSound();
                               text = 'FEVER!!';
                           }
                       }
                   }
                   
                   registerHit(points, text, 100);
                   return false;
               }

               headY = hitLineY;
               if (Math.random() > 0.5) {
                   createBurst(playAreaX + n.lane * laneWidth + laneWidth / 2, hitLineY);
               }
           }

           const bodyHeight = headY - tailY;
           if (bodyHeight > 0 && tailY < hitLineY + 20) {
                const x = playAreaX + n.lane * laneWidth;
                const w = laneWidth;
                const isOuter = (n.lane === 0 || n.lane === 3);
                
                const grad = ctx.createLinearGradient(x, tailY, x, headY);
                grad.addColorStop(0, isOuter ? 'rgba(226, 232, 240, 0.35)' : 'rgba(56, 189, 248, 0.35)');
                grad.addColorStop(1, isOuter ? 'rgba(248, 250, 252, 0.85)' : 'rgba(14, 165, 233, 0.85)');
                
                ctx.fillStyle = grad;
                ctx.fillRect(x + 6, tailY, w - 12, bodyHeight);
                
                // Tail Cap
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(x + 6, tailY, w - 12, 5);
           }
      }

      if (timeRemaining < -200 && !n.holding && !n.hit) { 
        n.hit = true;
        registerMiss();
        return false;
      }

      if (n.hit) return false;

      // Draw Note Head
      if (headY > trackTop - 30 && headY < hitLineY + 30) {
          const x = playAreaX + n.lane * laneWidth;
          const w = laneWidth;
          
          if (assets.tile && assets.tile.complete && assets.tile.naturalWidth !== 0) {
              ctx.drawImage(assets.tile, x + 2, headY - 9, w - 4, 18);
          } else {
              // Authentic DJMax Portable 2 notes: Silver-White outer & Electric-Blue inner
              const isOuter = (n.lane === 0 || n.lane === 3);
              const grad = ctx.createLinearGradient(x, headY - 9, x, headY + 9);
              
              if (n.type === 'HOLD') {
                grad.addColorStop(0, '#fef08a'); 
                grad.addColorStop(0.5, '#f59e0b');
                grad.addColorStop(1, '#b45309');
              } else if (isOuter) {
                // Metallic White / Silver bar (Lanes 1 & 4)
                grad.addColorStop(0, '#ffffff'); 
                grad.addColorStop(0.55, '#cbd5e1');
                grad.addColorStop(1, '#64748b');
              } else {
                // Electric Cyan / Blue bar (Lanes 2 & 3)
                grad.addColorStop(0, '#bae6fd'); 
                grad.addColorStop(0.5, '#0284c7');
                grad.addColorStop(1, '#1e40af');
              }
              
              ctx.fillStyle = grad;
              ctx.beginPath();
              ctx.roundRect(x + 2.5, headY - 9, w - 5, 18, 3);
              ctx.fill();
              
              // Glossy white top highlight bevel
              ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
              ctx.fillRect(x + 5, headY - 7, w - 10, 3);

              // Bottom crisp cyan edge glow
              ctx.fillStyle = isOuter ? 'rgba(56, 189, 248, 0.8)' : 'rgba(186, 230, 253, 0.9)';
              ctx.fillRect(x + 5, headY + 5, w - 10, 2);
          }
      }
      
      return true;
    });

    ctx.restore(); // End track clip

    // 7. PARTICLES (Batch Render at Hit Line)
    ctx.globalCompositeOperation = 'lighter';
    particlesRef.current = particlesRef.current.filter(p => {
      p.life -= 0.045;
      if (p.life <= 0) return false;

      ctx.globalAlpha = p.life;

      if (p.type === 'BURST_IMAGE' && assets.effect && assets.effect.complete && assets.effect.naturalWidth !== 0) {
        ctx.save();
        ctx.translate(p.x, p.y);
        const s = p.size * (1 + (1-p.life));
        ctx.rotate((1-p.life) * 1.5);
        try { ctx.drawImage(assets.effect, -s/2, -s/2, s, s); } catch (e) {}
        ctx.restore();
      } else if (p.type === 'BURST_IMAGE') {
         ctx.fillStyle = '#bae6fd';
         ctx.beginPath();
         ctx.arc(p.x, p.y, p.size * 0.7 * (1-p.life), 0, Math.PI*2);
         ctx.fill();
      } else {
        p.x += p.vx; p.y += p.vy;
        ctx.fillStyle = p.color;
        ctx.beginPath(); 
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); 
        ctx.fill();
      }
      return true;
    });
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // 8. Top Silver Visor & Dark Navy LCD Header
    ctx.fillStyle = '#0b1120';
    ctx.beginPath();
    ctx.roundRect(gearX + 6, gearTop + 5, gearWidth - 12, topDeckH - 8, 8);
    ctx.fill();

    // Metallic bevel around top LCD visor
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(gearX + 6, gearTop + 5, gearWidth - 12, topDeckH - 8, 8);
    ctx.stroke();

    // Cyan LED accent bar beneath top visor
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const visorBarGrad = ctx.createLinearGradient(playAreaX, 0, playAreaX + playAreaWidth, 0);
    visorBarGrad.addColorStop(0, '#0284c7');
    visorBarGrad.addColorStop(0.5, '#e0f2fe');
    visorBarGrad.addColorStop(1, '#0284c7');
    ctx.fillStyle = isFeverActiveRef.current ? '#fbbf24' : visorBarGrad;
    ctx.fillRect(playAreaX, trackTop - 2, playAreaWidth, 2.5);
    ctx.restore();

    // Top Visor Readout Text
    ctx.fillStyle = '#38bdf8';
    ctx.font = '900 10px Orbitron, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('4B', gearX + 16, gearTop + 26);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '900 11px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DJMAX PORTABLE 2', gearX + gearWidth / 2, gearTop + 23);

    ctx.fillStyle = isFeverActiveRef.current ? '#fbbf24' : '#94a3b8';
    ctx.font = '800 8px Orbitron, sans-serif';
    ctx.fillText(`SPEED x${(1500 / noteSpeed).toFixed(1)}`, gearX + gearWidth / 2, gearTop + 34);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '900 10px Orbitron, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${selectedSong?.bpm || 120}`, gearX + gearWidth - 16, gearTop + 26);

    // 9. Left Rail: Integrated Vertical FEVER Meter (Classic DMP2 Style)
    const leftSlotX = gearX + 5;
    const slotW = railWidth - 10;
    const slotTop = trackTop + 8;
    const slotBottom = hitLineY - 18;
    const slotH = Math.max(40, slotBottom - slotTop);

    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.roundRect(leftSlotX, slotTop, slotW, slotH, 4);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.stroke();

    const feverPct = isFeverActiveRef.current
        ? Math.max(0, (feverEndTimeRef.current - currentTimeMs) / 7000)
        : Math.min(1, feverRef.current / 100);
    const feverSegs = 24;
    const fSegH = (slotH - 6) / feverSegs;
    const activeFeverSegs = Math.round(feverPct * feverSegs);

    for (let s = 0; s < feverSegs; s++) {
        const sy = slotBottom - 3 - (s + 1) * fSegH;
        const lit = s < activeFeverSegs;
        let color = '#0284c7';
        if (s > feverSegs * 0.72) color = '#f59e0b';
        else if (s > feverSegs * 0.4) color = '#38bdf8';
        if (isFeverActiveRef.current && lit) color = (Math.floor(currentTimeMs / 80) % 2 === 0) ? '#fbbf24' : '#fef08a';

        ctx.fillStyle = lit ? color : 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(leftSlotX + 2, sy + 1, slotW - 4, Math.max(1.5, fSegH - 2));
    }

    ctx.fillStyle = isFeverActiveRef.current ? '#fbbf24' : '#e2e8f0';
    ctx.font = '900 7px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FVR', leftSlotX + slotW / 2, hitLineY - 5);

    // 10. Right Rail: Integrated Vertical HP / Groove Meter (Classic DMP2 Style)
    const rightSlotX = gearX + gearWidth - railWidth + 5;
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.roundRect(rightSlotX, slotTop, slotW, slotH, 4);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.stroke();

    const hpPct = Math.max(0, Math.min(1, healthRef.current / 100));
    const activeHpSegs = Math.round(hpPct * feverSegs);

    for (let s = 0; s < feverSegs; s++) {
        const sy = slotBottom - 3 - (s + 1) * fSegH;
        const lit = s < activeHpSegs;
        let hpColor = '#22c55e';
        if (hpPct < 0.3) hpColor = '#ef4444';
        else if (s > feverSegs * 0.65) hpColor = '#38bdf8';
        else if (s > feverSegs * 0.3) hpColor = '#10b981';

        ctx.fillStyle = lit ? hpColor : 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(rightSlotX + 2, sy + 1, slotW - 4, Math.max(1.5, fSegH - 2));
    }

    ctx.fillStyle = hpPct < 0.3 ? '#ef4444' : '#38bdf8';
    ctx.font = '900 7px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HP', rightSlotX + slotW / 2, hitLineY - 5);

    // 11. Bottom Brushed Metallic Key Deck Housing
    const deckY = hitLineY;
    const deckH = gearBottom - deckY;
    const deckGrad = ctx.createLinearGradient(gearX, deckY, gearX, gearBottom);
    deckGrad.addColorStop(0, '#94a3b8');
    deckGrad.addColorStop(0.18, '#e2e8f0');
    deckGrad.addColorStop(0.45, '#64748b');
    deckGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = deckGrad;
    ctx.beginPath();
    ctx.roundRect(gearX + 2, deckY, gearWidth - 4, deckH - 2, [0, 0, 12, 12]);
    ctx.fill();

    // Recessed black key well
    const keyWellH = 54;
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.roundRect(playAreaX - 2, hitLineY + 4, playAreaWidth + 4, keyWellH, 6);
    ctx.fill();

    // 12. Judgment Line & Iconic DMP2 Side Arrow Pointers
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = isFeverActiveRef.current ? '#fbbf24' : '#38bdf8';
    ctx.shadowBlur = 12;
    ctx.fillStyle = isFeverActiveRef.current ? '#fbbf24' : '#38bdf8';
    ctx.fillRect(playAreaX, hitLineY - 2, playAreaWidth, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(playAreaX, hitLineY - 1, playAreaWidth, 2);
    ctx.restore();

    // Left & Right Arrow Pointers pointing inward to judgment line
    ctx.fillStyle = isFeverActiveRef.current ? '#fbbf24' : '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(playAreaX - 7, hitLineY - 5);
    ctx.lineTo(playAreaX + 1, hitLineY);
    ctx.lineTo(playAreaX - 7, hitLineY + 5);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(playAreaX + playAreaWidth + 7, hitLineY - 5);
    ctx.lineTo(playAreaX + playAreaWidth - 1, hitLineY);
    ctx.lineTo(playAreaX + playAreaWidth + 7, hitLineY + 5);
    ctx.closePath();
    ctx.fill();

    // 13. 3D Beveled Glossy Keycaps inside the DMP2 Deck
    const keyH = 48;
    const keyY = hitLineY + 7;
    for (let i = 0; i < 4; i++) {
        const lx = playAreaX + i * laneWidth;
        const isPressed = lanePressedRef.current[i];
        const isOuter = (i === 0 || i === 3);

        ctx.save();
        const kGrad = ctx.createLinearGradient(lx, keyY, lx, keyY + keyH);
        if (isPressed) {
            if (isFeverActiveRef.current) {
                kGrad.addColorStop(0, '#fef08a');
                kGrad.addColorStop(1, '#d97706');
            } else if (isOuter) {
                kGrad.addColorStop(0, '#ffffff');
                kGrad.addColorStop(1, '#38bdf8');
            } else {
                kGrad.addColorStop(0, '#7dd3fc');
                kGrad.addColorStop(1, '#0369a1');
            }
        } else {
            if (isOuter) {
                kGrad.addColorStop(0, '#e2e8f0');
                kGrad.addColorStop(0.55, '#94a3b8');
                kGrad.addColorStop(1, '#475569');
            } else {
                kGrad.addColorStop(0, '#38bdf8');
                kGrad.addColorStop(0.55, '#0369a1');
                kGrad.addColorStop(1, '#0f172a');
            }
        }

        ctx.fillStyle = kGrad;
        ctx.beginPath();
        ctx.roundRect(lx + 2.5, keyY, laneWidth - 5, keyH, 4);
        ctx.fill();

        // Top gloss bevel on keycap
        ctx.fillStyle = isPressed ? 'rgba(255, 255, 255, 0.75)' : 'rgba(255, 255, 255, 0.35)';
        ctx.fillRect(lx + 4.5, keyY + 2, laneWidth - 9, 6);

        ctx.strokeStyle = isPressed ? '#ffffff' : 'rgba(15, 23, 42, 0.7)';
        ctx.lineWidth = isPressed ? 1.5 : 1;
        ctx.beginPath();
        ctx.roundRect(lx + 2.5, keyY, laneWidth - 5, keyH, 4);
        ctx.stroke();

        // Keybind character engraved on keycap
        ctx.fillStyle = isPressed ? '#0f172a' : (isOuter ? '#0f172a' : '#f8fafc');
        ctx.font = '900 15px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((profile.keybinds[i] || '').toUpperCase(), lx + laneWidth / 2, keyY + keyH / 2 + 2);
        ctx.restore();
    }

    // Bottom Metallic Nameplate & Status Strip
    const plateY = keyY + keyH + 8;
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.roundRect(gearX + 12, plateY, gearWidth - 24, 20, 4);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = isFeverActiveRef.current ? '#fbbf24' : (feverRef.current >= 100 ? '#fbbf24' : '#38bdf8');
    ctx.font = '800 8px Orbitron, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(isFeverActiveRef.current ? 'FEVER ACTIVE' : (feverRef.current >= 100 ? 'FEVER READY' : `FVR ${Math.floor(feverRef.current)}%`), gearX + 20, plateY + 10);

    ctx.fillStyle = '#cbd5e1';
    ctx.textAlign = 'center';
    ctx.fillText('PORTABLE 2', gearX + gearWidth / 2, plateY + 10);

    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'right';
    ctx.fillText(`HP ${Math.max(0, Math.round(healthRef.current))}%`, gearX + gearWidth - 20, plateY + 10);

    // Metallic corner rivets on the DMP2 silver chassis
    const rivets = [
        [gearX + 10, gearTop + 10],
        [gearX + gearWidth - 10, gearTop + 10],
        [gearX + 10, gearBottom - 10],
        [gearX + gearWidth - 10, gearBottom - 10]
    ];
    rivets.forEach(([rx, ry]) => {
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(rx - 0.5, ry - 0.5, 1, 0, Math.PI * 2);
        ctx.fill();
    });

    // 14. In-Gear Combo Counter (Classic DMP2 Bold Metallic Italic inside upper-middle playfield)
    if (comboRef.current > 0) {
        ctx.save();
        const comboY = trackTop + (hitLineY - trackTop) * 0.44;
        ctx.font = 'italic 900 46px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(2, 6, 23, 0.9)';
        ctx.strokeText(`${comboRef.current}`, playAreaX + playAreaWidth / 2, comboY);
        ctx.fillStyle = '#f8fafc';
        ctx.shadowColor = isFeverActiveRef.current ? '#fbbf24' : '#38bdf8';
        ctx.shadowBlur = 14;
        ctx.fillText(`${comboRef.current}`, playAreaX + playAreaWidth / 2, comboY);

        ctx.font = 'italic 900 11px Orbitron, sans-serif';
        ctx.fillStyle = isFeverActiveRef.current ? '#fbbf24' : '#7dd3fc';
        ctx.shadowBlur = 6;
        ctx.fillText(isFeverActiveRef.current ? 'FEVER COMBO' : 'COMBO', playAreaX + playAreaWidth / 2, comboY + 16);
        ctx.restore();
    }

    // 15. In-Gear Judgment Badge (DMP2 Style right above judgment line)
    const activeFb = feedbackRef.current;
    if (activeFb && performance.now() - activeFb.timestamp < 950) {
        ctx.save();
        const judgeY = hitLineY - 58;
        const ageRatio = (performance.now() - activeFb.timestamp) / 950;
        ctx.globalAlpha = ageRatio > 0.7 ? Math.max(0, 1 - (ageRatio - 0.7) / 0.3) : 1;
        ctx.font = 'italic 900 22px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(2, 6, 23, 0.9)';
        ctx.strokeText(activeFb.text, playAreaX + playAreaWidth / 2, judgeY);
        ctx.fillStyle = activeFb.text === 'MISS' ? '#ef4444' : (activeFb.text.includes('PERFECT') || activeFb.text.includes('FEVER') || activeFb.text.includes('COMPLETE') ? '#38bdf8' : '#fef08a');
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 12;
        ctx.fillText(activeFb.text, playAreaX + playAreaWidth / 2, judgeY);

        ctx.font = '800 11px Orbitron, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 4;
        ctx.fillText(`${activeFb.percent.toFixed(0)}%`, playAreaX + playAreaWidth / 2, judgeY + 16);
        ctx.restore();
    }

    requestRef.current = requestAnimationFrame(update);
  }, [gameState, selectedSong, effectColor, assets, profile.keybinds, pollGamepad, showSettings, playFeverSound]);

  // Matchmaking Logic (Simulated)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (gameState === GameState.CONNECTING) {
        setMatchmakingTime(5);
        setOpponent(null);
        interval = setInterval(() => {
            setMatchmakingTime(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    // Generate random AI profile
                    const randomName = `${AI_PREFIXES[Math.floor(Math.random() * AI_PREFIXES.length)]}_${AI_SUFFIXES[Math.floor(Math.random() * AI_SUFFIXES.length)]}`;
                    const randomAvatar = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
                    
                    setOpponent({ 
                        name: randomName, 
                        score: 0, 
                        avatar: randomAvatar, 
                        isAi: true 
                    });
                    setGameState(GameState.READY_TO_START);
                    return 0;
                }
                return prev - 1;
            });
            if (Math.random() > 0.85) {
                clearInterval(interval);
                setOpponent({ name: 'Kaito_Runner', score: 0, avatar: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=200', isAi: false });
                setGameState(GameState.READY_TO_START);
            }
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState]);

  // AI Opponent Logic loop
  useEffect(() => {
    let aiInterval: ReturnType<typeof setInterval>;
    if (gameState === GameState.PLAYING && isVersus && opponent) {
        aiInterval = setInterval(() => {
            const currentScore = scoreRef.current;
            const targetAiScore = Math.max(0, currentScore * (opponent.isAi ? 0.9 : 1.1)); 
            setOpponent(prev => prev ? { ...prev, score: prev.score < targetAiScore ? prev.score + Math.floor(Math.random() * 500) : prev.score } : null);
        }, 1000);
    }
    return () => clearInterval(aiInterval);
  }, [gameState, isVersus, opponent]);

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
        requestRef.current = requestAnimationFrame(update);
        if (selectedSong?.videoUrl && videoRef.current) {
            // Video Sync check
            const diff = Math.abs(videoRef.current.currentTime - ((performance.now() - startTimeRef.current) / 1000));
            if (diff > 0.5) videoRef.current.currentTime = (performance.now() - startTimeRef.current) / 1000;
            videoRef.current.play().catch(() => {});
        }
    } else {
        cancelAnimationFrame(requestRef.current);
        if (videoRef.current) videoRef.current.pause();
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [update, gameState, selectedSong]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Rebinding Logic
      if (showSettings && bindingTarget !== null && bindingType === 'KEY') {
          const keyToBind = e.key.toLowerCase();
          if (bindingTarget === 'FEVER') {
              const updated = updateSettings({ feverKeybind: keyToBind });
              setProfileState(updated);
          } else {
              const newBinds = [...profileRef.current.keybinds];
              newBinds[bindingTarget as number] = keyToBind;
              const updated = setKeybinds(newBinds);
              setProfileState(updated);
          }
          setBindingTarget(null);
          setBindingType(null);
          return;
      }

      const feverKeyBind = (profile.settings.feverKeybind || ' ').toLowerCase();
      if (e.key.toLowerCase() === feverKeyBind && !e.repeat) {
          e.preventDefault();
          activateFever();
          return;
      }
      
      const idx = profile.keybinds.indexOf(e.key.toLowerCase());
      if (idx !== -1) {
        if (e.type === 'keydown' && !e.repeat) handlePress(idx);
        else if (e.type === 'keyup') lanePressedRef.current[idx] = false;
      }
      if (e.key === 'Escape' && gameState === GameState.PLAYING) {
          pauseTimeRef.current = performance.now();
          setGameState(GameState.PAUSED);
      }
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKey);
    return () => { 
        window.removeEventListener('keydown', handleKey); 
        window.removeEventListener('keyup', handleKey); 
    };
  }, [gameState, profile.keybinds, handlePress, showSettings, bindingTarget, bindingType, activateFever]); 

  const initGame = (song: Song) => {
      setSelectedSong(song);
      setGameState(isVersus ? GameState.CONNECTING : GameState.READY_TO_START);
  };

  const startSong = () => {
    setGameState(GameState.PLAYING);
    initAudioSystem(); // Initialize High Fidelity Audio Chain
    scoreRef.current = 0; comboRef.current = 0; healthRef.current = 100; accuracySum.current = 0; totalNotesProcessed.current = 0;
    notesRef.current = []; lastNoteTimeRef.current = 0; startTimeRef.current = performance.now();
    feverRef.current = 0; isFeverActiveRef.current = false; feverEndTimeRef.current = 0; feverReadyRef.current = false;
    setScore(0); setCombo(0); setAccuracy(100); setHealth(100); setFeedback(null); setFeverReady(false);
  };

  const resumeGame = () => {
      const pausedDuration = performance.now() - pauseTimeRef.current;
      startTimeRef.current += pausedDuration;
      // Adjust fever timer offset
      if (isFeverActiveRef.current) feverEndTimeRef.current += pausedDuration;
      setGameState(GameState.PLAYING);
      if (selectedSong?.videoUrl && videoRef.current) videoRef.current.play();
  };

  const retrySong = () => {
    if (selectedSong) startSong();
    if (isVersus) setOpponent(prev => prev ? {...prev, score: 0} : null);
  };

  const handleShare = async () => {
      if (!selectedSong) return;
      
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Background Fill
      const grad = ctx.createLinearGradient(0, 0, 1920, 1080);
      grad.addColorStop(0, '#020617');
      grad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1920, 1080);

      // 2. Draw Song Cover Background (Blurred/Dimmed)
      try {
          const img = new Image();
          img.crossOrigin = "Anonymous";
          img.src = selectedSong.cover;
          
          // Wait for image load properly
          const loaded = await new Promise<boolean>((resolve) => {
              img.onload = () => resolve(true);
              img.onerror = () => resolve(false); 
          });
          
          if (loaded) {
              ctx.save();
              ctx.globalAlpha = 0.3;
              // Simple "cover" fit
              const scale = Math.max(1920 / img.width, 1080 / img.height);
              const x = (1920 / 2) - (img.width / 2) * scale;
              const y = (1080 / 2) - (img.height / 2) * scale;
              ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
              ctx.restore();
          }
      } catch (e) { console.error(e); }

      // 3. UI Elements (Cyberpunk frames)
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 4;
      ctx.strokeRect(50, 50, 1820, 980);
      
      // Title Section
      ctx.fillStyle = '#fff';
      ctx.font = '900 italic 120px Orbitron'; 
      ctx.fillText('SYNC COMPLETE', 100, 200);
      
      ctx.fillStyle = '#ec4899'; // Pink
      ctx.font = 'bold 60px sans-serif';
      ctx.fillText(selectedSong.title.toUpperCase(), 100, 300);
      
      ctx.fillStyle = '#94a3b8'; // Slate 400
      ctx.font = '40px sans-serif';
      ctx.fillText(selectedSong.artist, 100, 360);

      // Score Section (Big Center)
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = '900 italic 250px Orbitron';
      ctx.fillText(score.toLocaleString(), 1800, 600);
      
      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 50px sans-serif';
      ctx.fillText('TOTAL SCORE', 1800, 400);

      // Accuracy & Rank
      ctx.textAlign = 'right';
      ctx.fillStyle = '#22d3ee'; // Cyan
      ctx.font = '900 100px Orbitron';
      ctx.fillText(`${accuracy.toFixed(1)}%`, 1800, 800);
      ctx.font = 'bold 40px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText('SYNCHRONIZATION RATE', 1800, 710);
      
      // Player Stamp
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 40px sans-serif';
      ctx.fillText(`PILOT: ${profile.username}`, 100, 950);
      ctx.fillStyle = '#64748b';
      ctx.font = '30px sans-serif';
      ctx.fillText(new Date().toLocaleDateString(), 100, 1000);

      // 4. Share or Download fallback
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) return;

      const file = new File([blob], `djmix_score_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const nav = navigator as any;

      if (nav.canShare && nav.canShare({ files: [file] })) {
          try {
              await nav.share({
                  title: 'DJMIX LOVE V Score',
                  text: `I scored ${score.toLocaleString()} on ${selectedSong.title} with ${accuracy.toFixed(1)}% precision! Can you beat my score? #DJMIXLOVEV`,
                  files: [file],
              });
          } catch (error) {
              console.log('Share was cancelled or failed.', error);
          }
      } else {
          // Fallback to downloading if Web Share API is not supported
          const dataUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = file.name;
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(dataUrl);
      }
  };

  const getFeedbackClass = (text: string) => {
    if (text.includes('PERFECT')) return 'from-yellow-300 via-yellow-400 to-yellow-600';
    if (text.includes('GREAT')) return 'from-green-400 via-green-500 to-green-700';
    if (text.includes('NICE')) return 'from-gray-300 via-gray-400 to-gray-500';
    if (text.includes('GOOD')) return 'from-gray-400 via-gray-500 to-gray-600';
    if (text === 'MISS') return 'from-red-500 via-red-600 to-red-700';
    if (text.includes('HOLD')) return 'from-yellow-300 via-orange-400 to-orange-600';
    if (text.includes('COMPLETE')) return 'from-cyan-300 via-cyan-500 to-cyan-700';
    if (text.includes('FEVER')) return 'from-yellow-300 via-orange-500 to-red-600';
    return 'from-white to-gray-300';
  };

  // Settings Handlers
  const handleSettingChange = (key: keyof typeof profile.settings, val: any) => {
      const updated = updateSettings({ [key]: val });
      setProfileState(updated);
  };

  return (
    <div className="h-full w-full bg-black text-white relative font-mono overflow-hidden select-none">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        {selectedSong?.videoUrl ? (
             <video ref={videoRef} src={selectedSong.videoUrl} crossOrigin="anonymous" className="w-full h-full object-cover opacity-80" loop={false} muted={false} playsInline />
        ) : (
            <>
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/80 via-slate-950/90 to-pink-950/80" />
                <div className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay" style={{ backgroundImage: `url(${selectedSong?.cover || 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=1200'})` }} />
            </>
        )}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '100px 100px' }} />
      </div>

      {/* SETTINGS BUTTON */}
      <button 
        onClick={() => { setShowSettings(true); if(gameState === GameState.PLAYING) { pauseTimeRef.current = performance.now(); setGameState(GameState.PAUSED); } }}
        className="absolute top-8 right-24 z-50 bg-slate-800/80 p-3 rounded-xl border border-white/20 hover:bg-slate-700 hover:scale-105 transition-all text-xl"
      >
        ⚙️
      </button>

      {/* SETTINGS MODAL */}
      {showSettings && (
          <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center animate-fade-in p-6">
              <div className="bg-slate-900 w-full max-w-2xl rounded-3xl border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.1)] flex flex-col overflow-hidden max-h-[90vh]">
                  <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-950">
                      <h2 className="text-3xl font-black italic text-cyan-400">SYSTEM CONFIG</h2>
                      <button onClick={() => setShowSettings(false)} className="text-2xl hover:text-red-500 transition-colors">×</button>
                  </div>
                  <div className="p-8 overflow-y-auto space-y-8">
                      {/* Audio */}
                      <section>
                          <h3 className="text-sm font-bold text-pink-500 uppercase tracking-widest mb-4">Audio Levels (Dolby Atmos Ready)</h3>
                          <div className="space-y-4">
                              {['master', 'music', 'sfx'].map(type => (
                                  <div key={type} className="flex items-center gap-4">
                                      <div className="w-24 text-xs font-bold uppercase text-gray-400">{type}</div>
                                      <input 
                                        type="range" min="0" max="1" step="0.05" 
                                        value={(profile.settings as any)[`${type}Volume`]}
                                        onChange={(e) => handleSettingChange(`${type}Volume` as any, parseFloat(e.target.value))}
                                        className="flex-1 accent-cyan-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                      />
                                      <div className="w-12 text-right text-xs font-mono">{Math.round((profile.settings as any)[`${type}Volume`] * 100)}%</div>
                                  </div>
                              ))}
                          </div>
                      </section>

                      {/* Gameplay */}
                      <section>
                          <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-widest mb-4">Gameplay</h3>
                          
                          <div className="flex items-center gap-4 mb-6">
                              <div className="w-24 text-xs font-bold uppercase text-gray-400">Note Speed</div>
                              <input 
                                type="range" min="500" max="2500" step="100" 
                                value={profile.settings.noteSpeed || 1500}
                                onChange={(e) => handleSettingChange('noteSpeed', parseInt(e.target.value))}
                                className="flex-1 accent-yellow-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                              />
                              <div className="w-12 text-right text-xs font-mono">{((profile.settings.noteSpeed || 1500)/1000).toFixed(1)}s</div>
                          </div>

                          <div className="flex items-center justify-between bg-slate-800 p-4 rounded-xl border border-white/10">
                              <div>
                                  <div className="font-bold text-white text-sm">Auto Fever</div>
                                  <div className="text-[10px] text-gray-400 mt-1">Trigger fever automatically when full</div>
                              </div>
                              <button
                                  onClick={() => handleSettingChange('autoFever', !profile.settings.autoFever)}
                                  className={`w-14 h-8 rounded-full transition-colors relative flex-shrink-0 ${profile.settings.autoFever ? 'bg-orange-500' : 'bg-slate-600'}`}
                              >
                                  <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-transform ${profile.settings.autoFever ? 'translate-x-7' : 'translate-x-1'}`} />
                              </button>
                          </div>
                      </section>
                      
                      {/* Input Remapping */}
                      <section>
                          <h3 className="text-sm font-bold text-green-500 uppercase tracking-widest mb-4">Input Mapping</h3>
                          <div className="grid grid-cols-4 gap-4 mb-4">
                              {['LANE 1', 'LANE 2', 'LANE 3', 'LANE 4'].map((label, i) => (
                                  <div key={i} className="flex flex-col gap-2">
                                      <div className="text-[10px] text-center text-gray-500 font-bold">{label}</div>
                                      
                                      {/* Keyboard Bind */}
                                      <button 
                                        onClick={() => { setBindingTarget(i); setBindingType('KEY'); }}
                                        className={`p-3 rounded-xl border font-black text-xl uppercase transition-all ${bindingTarget === i && bindingType === 'KEY' ? 'bg-pink-600 border-pink-400 animate-pulse' : 'bg-slate-800 border-white/10 hover:border-white/30'}`}
                                      >
                                          {bindingTarget === i && bindingType === 'KEY' ? 'PRESS KEY' : profile.keybinds[i]}
                                      </button>
                                      
                                      {/* Gamepad Bind */}
                                      <button 
                                        onClick={() => { setBindingTarget(i); setBindingType('GAMEPAD'); }}
                                        className={`p-2 rounded-xl border font-bold text-xs uppercase transition-all ${bindingTarget === i && bindingType === 'GAMEPAD' ? 'bg-cyan-600 border-cyan-400 animate-pulse' : 'bg-slate-800 border-white/10 hover:border-white/30 text-gray-400'}`}
                                      >
                                          {bindingTarget === i && bindingType === 'GAMEPAD' ? 'PRESS BTN' : `BTN ${profile.settings.gamepadBindings[i]}`}
                                      </button>
                                  </div>
                              ))}
                          </div>

                          {/* Fever Remapping */}
                          <div className="flex flex-col gap-2 max-w-xs mx-auto border-t border-white/10 pt-4 mt-4">
                              <div className="text-[10px] text-center text-orange-500 font-bold tracking-widest uppercase">Manual Fever Bind</div>
                              <div className="flex gap-4">
                                  <button 
                                    onClick={() => { setBindingTarget('FEVER'); setBindingType('KEY'); }}
                                    className={`flex-1 p-3 rounded-xl border font-black text-lg uppercase transition-all ${bindingTarget === 'FEVER' && bindingType === 'KEY' ? 'bg-orange-600 border-orange-400 animate-pulse' : 'bg-slate-800 border-white/10 hover:border-white/30'}`}
                                  >
                                      {bindingTarget === 'FEVER' && bindingType === 'KEY' ? 'PRESS KEY' : ((profile.settings.feverKeybind || ' ') === ' ' ? 'SPACE' : profile.settings.feverKeybind)}
                                  </button>
                                  <button 
                                    onClick={() => { setBindingTarget('FEVER'); setBindingType('GAMEPAD'); }}
                                    className={`flex-1 p-2 rounded-xl border font-bold text-xs uppercase transition-all ${bindingTarget === 'FEVER' && bindingType === 'GAMEPAD' ? 'bg-cyan-600 border-cyan-400 animate-pulse' : 'bg-slate-800 border-white/10 hover:border-white/30 text-gray-400'}`}
                                  >
                                      {bindingTarget === 'FEVER' && bindingType === 'GAMEPAD' ? 'PRESS BTN' : `BTN ${profile.settings.feverGamepadBinding ?? 0}`}
                                  </button>
                              </div>
                          </div>
                          
                          <p className="text-center text-[10px] text-gray-500 mt-4">Connect a gamepad to configure controller inputs.</p>
                      </section>
                  </div>
              </div>
          </div>
      )}

      {/* HELP MODAL */}
      {showHelp && (
          <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center animate-fade-in p-6">
              <div className="bg-slate-900 w-full max-w-2xl rounded-3xl border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.1)] flex flex-col overflow-hidden">
                  <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-950">
                      <h2 className="text-3xl font-black italic text-cyan-400">HOW TO PLAY</h2>
                      <button onClick={() => setShowHelp(false)} className="text-2xl hover:text-red-500 transition-colors">×</button>
                  </div>
                  <div className="p-8 space-y-6 text-gray-300">
                      <div className="flex items-start gap-4">
                          <div className="text-3xl">🎯</div>
                          <div>
                              <h3 className="text-xl font-bold text-white mb-1">Hit The Notes</h3>
                              <p className="text-sm leading-relaxed">Press the corresponding key when the falling notes align perfectly with the receptor line at the bottom.</p>
                          </div>
                      </div>
                      <div className="flex items-start gap-4">
                          <div className="text-3xl">⌨️</div>
                          <div>
                              <h3 className="text-xl font-bold text-white mb-1">Controls</h3>
                              <p className="text-sm leading-relaxed">Use your bound keys (Default: D, F, J, K) or connect a Gamepad. You can remap these in the Settings (⚙️).</p>
                          </div>
                      </div>
                      <div className="flex items-start gap-4">
                          <div className="text-3xl">✨</div>
                          <div>
                              <h3 className="text-xl font-bold text-white mb-1">Note Types</h3>
                              <ul className="list-disc list-inside text-sm mt-2 space-y-2">
                                  <li><span className="text-blue-400 font-bold">Tap Notes:</span> Press exactly when they hit the line.</li>
                                  <li><span className="text-yellow-400 font-bold">Hold Notes:</span> Press and hold until the tail completely passes the line.</li>
                              </ul>
                          </div>
                      </div>
                      <div className="flex items-start gap-4">
                          <div className="text-3xl">🔥</div>
                          <div>
                              <h3 className="text-xl font-bold text-white mb-1">Fever Mode</h3>
                              <p className="text-sm leading-relaxed">String together consecutive hits to build the Fever Gauge. Toggle Auto Fever in settings, or press your configured Fever button (Default: SPACE / Gamepad A) to unleash 7 seconds of doubled score and increased precision!</p>
                          </div>
                      </div>
                      <div className="flex items-start gap-4">
                          <div className="text-3xl">❤️</div>
                          <div>
                              <h3 className="text-xl font-bold text-white mb-1">Survival</h3>
                              <p className="text-sm leading-relaxed">Missing notes drains your health. Hitting notes restores it. Don't let it reach 0, or it's game over!</p>
                          </div>
                      </div>
                  </div>
                  <div className="p-6 border-t border-white/10 bg-slate-950 flex justify-end">
                      <button onClick={() => setShowHelp(false)} className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-3 rounded-xl font-black transition-all">GOT IT</button>
                  </div>
              </div>
          </div>
      )}

      {gameState === GameState.START_SCREEN && (
        <div className="relative z-10 h-full flex flex-col items-center justify-center bg-slate-950/80 cursor-pointer" onClick={() => setGameState(GameState.SONG_SELECT)}>
           <div className="text-center animate-pop-in">
              <h1 className="text-9xl font-black italic tracking-tighter text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">DJMIX <span className="text-pink-500">LOVE V</span></h1>
              <div className="mt-12 text-2xl font-bold tracking-[1em] text-cyan-400 animate-pulse uppercase">Tap to Sync</div>
              {gamepadConnected && <div className="mt-4 text-green-400 font-bold text-sm tracking-widest animate-pulse">🎮 GAMEPAD CONNECTED</div>}
           </div>
        </div>
      )}

      {gameState === GameState.SONG_SELECT && (
        <div className="relative z-10 h-full p-12 bg-slate-950/90 flex flex-col animate-fade-in">
          <div className="flex justify-between items-start mb-12">
            <div className="flex flex-col gap-2">
                <button onClick={onBack} className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-xl font-black border border-white/10 transition-all active:scale-95 text-sm w-fit flex items-center gap-2 text-gray-400 hover:text-white">
                    <span>&larr;</span> BACK TO HUB
                </button>
                <h2 className="text-6xl font-black italic tracking-tighter mt-4 text-white drop-shadow-lg">SELECT TRACK</h2>
            </div>
            
            <div className="flex flex-col gap-4 items-end mr-32"> {/* Margined away from the absolute settings icon to keep them far apart */}
                <button onClick={() => setShowHelp(true)} className="bg-cyan-900/40 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-600/40 px-8 py-3 rounded-2xl font-black transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] flex items-center gap-3">
                    <span className="text-2xl">❓</span> <span>HOW TO PLAY</span>
                </button>
                <button onClick={() => setIsVersus(!isVersus)} className={`px-8 py-3 rounded-2xl font-black border transition-all flex items-center gap-3 ${isVersus ? 'bg-red-600 border-red-500 animate-pulse shadow-[0_0_20px_red]' : 'bg-slate-800 border-white/10 text-gray-400 hover:bg-slate-700'}`}>
                    <span className="text-2xl">⚔️</span> <span>{isVersus ? 'MULTIPLAYER: ON' : 'SINGLE PLAYER'}</span>
                </button>
            </div>
          </div>
          
          <div className="mb-8 bg-blue-900/20 border border-blue-500/30 p-6 rounded-[2rem] flex items-center gap-6 relative overflow-hidden group">
             <div className="absolute inset-0 bg-blue-600/5 group-hover:bg-blue-600/10 transition-colors" />
             <div className="w-24 h-24 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/40 text-4xl shadow-[0_0_15px_rgba(59,130,246,0.3)] shrink-0">📂</div>
             <div className="flex-1 relative z-10">
                <h3 className="text-2xl font-black italic text-blue-400 mb-1">IMPORT MEDIA</h3>
                <p className="text-blue-200/60 text-xs font-bold tracking-widest uppercase">Load local MP4/WEBM tracks</p>
             </div>
             
             <label className="relative z-10 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 px-8 py-4 rounded-xl font-black cursor-pointer transition-all shadow-lg active:scale-95 flex items-center gap-3 shrink-0">
                <span className="text-xl">📥</span><span>SELECT VIDEO</span>
                <input type="file" accept=".mp4, .webm, .avi" className="hidden" onChange={handleVideoImport} />
            </label>
          </div>

          <div className="flex-1 overflow-y-auto space-y-6 pr-4">
            {songs.map(s => (
              <div key={s.id} onClick={() => initGame(s)} className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] hover:bg-white/10 hover:border-pink-500/50 cursor-pointer flex items-center gap-10 transition-all group relative">
                <div className="relative overflow-hidden rounded-3xl w-40 h-40">
                    <img src={s.cover} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="flex-1">
                  <div className="text-pink-500 font-black tracking-widest text-sm mb-2">{s.difficulty} // {s.bpm} BPM</div>
                  <div className="text-5xl font-black italic tracking-tight">{s.title}</div>
                  <div className="text-gray-400 text-xl font-bold mt-1 uppercase tracking-wider">{s.artist}</div>
                </div>
                <div className="text-cyan-400 font-black text-xl border-l border-white/10 pl-10 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 mr-12">
                  {isVersus ? 'CHALLENGE' : 'PLAY TRACK'}
                </div>
                
                {s.id.startsWith('custom_') && (
                    <button 
                        onClick={(e) => handleRemoveSong(e, s.id)}
                        className="absolute top-4 right-4 z-50 bg-red-500/20 hover:bg-red-600 text-red-500 hover:text-white w-10 h-10 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 font-bold shadow-lg"
                        title="Remove Track"
                    >
                        ✕
                    </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {gameState === GameState.CONNECTING && (
          <div className="relative z-50 h-full bg-black/90 flex flex-col items-center justify-center animate-pulse">
              <div className="text-4xl font-black text-cyan-400 mb-4">SEARCHING FOR OPPONENT...</div>
              <div className="text-6xl font-black text-white mb-8">{matchmakingTime}</div>
              <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 w-1/2 animate-[pet-run_1s_infinite]" />
              </div>
          </div>
      )}

      {gameState === GameState.READY_TO_START && (
           <div className="relative z-50 h-full bg-black/95 flex flex-col items-center justify-center gap-8 animate-fade-in">
                <h2 className="text-6xl font-black italic text-pink-500">SYSTEM READY</h2>
                <div className="flex flex-col items-center gap-2">
                    <p className="text-gray-400 text-sm tracking-widest uppercase">Target Track</p>
                    <p className="text-2xl font-bold text-white">{selectedSong?.title}</p>
                </div>
                {isVersus && opponent && (
                     <div className="bg-white/10 p-6 rounded-2xl border border-white/20 flex items-center gap-4">
                        <span className="text-red-500 font-black">VS</span>
                        <div className="flex items-center gap-2">
                             <img src={opponent.avatar} className="w-10 h-10 rounded-full" />
                             <span className={opponent.isAi ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>{opponent.name}</span>
                        </div>
                     </div>
                )}
                {gamepadConnected && <div className="text-green-500 font-bold tracking-widest bg-green-900/20 px-4 py-2 rounded-full border border-green-500/20">🎮 CONTROLLER ACTIVE</div>}
                <button onClick={startSong} className="mt-8 px-16 py-6 bg-gradient-to-r from-pink-600 to-cyan-600 rounded-full font-black text-3xl hover:scale-105 transition-transform shadow-[0_0_50px_rgba(236,72,153,0.5)]">START LINK</button>
           </div>
      )}

      {gameState === GameState.PLAYING && (
        <>
          <canvas ref={canvasRef} className="absolute inset-0 z-10 w-full h-full pointer-events-none transform-gpu will-change-transform" />
          
          {/* Smart Pointer / Touch Input Overlay mapped cleanly to DMP2 Gear Lanes */}
          <div
              className="absolute inset-0 z-20 cursor-pointer touch-none"
              onMouseDown={(e) => {
                  const canvas = canvasRef.current;
                  if (!canvas) return;
                  const rect = canvas.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const { playAreaX, playAreaWidth, laneWidth } = computeGearMetrics(rect.width, rect.height);
                  const lane = x >= playAreaX && x <= playAreaX + playAreaWidth
                      ? Math.min(3, Math.max(0, Math.floor((x - playAreaX) / laneWidth)))
                      : Math.min(3, Math.max(0, Math.floor((x / rect.width) * 4)));
                  handlePress(lane);
              }}
              onMouseUp={() => {
                  lanePressedRef.current = [false, false, false, false];
              }}
              onTouchStart={(e) => {
                  e.preventDefault();
                  const canvas = canvasRef.current;
                  if (!canvas) return;
                  const rect = canvas.getBoundingClientRect();
                  const { playAreaX, playAreaWidth, laneWidth } = computeGearMetrics(rect.width, rect.height);
                  for (let i = 0; i < e.changedTouches.length; i++) {
                      const t = e.changedTouches.item(i);
                      if (!t) continue;
                      const x = t.clientX - rect.left;
                      const lane = x >= playAreaX && x <= playAreaX + playAreaWidth
                          ? Math.min(3, Math.max(0, Math.floor((x - playAreaX) / laneWidth)))
                          : Math.min(3, Math.max(0, Math.floor((x / rect.width) * 4)));
                      handlePress(lane);
                  }
              }}
              onTouchEnd={(e) => {
                  e.preventDefault();
                  if (e.touches.length === 0) {
                      lanePressedRef.current = [false, false, false, false];
                  }
              }}
          />

          {/* Top-Right DMP2 Digital HUD (Leaves Left Gear & Right BGA Clear) */}
          <div className="absolute top-5 right-5 left-5 sm:left-[40%] flex flex-wrap justify-end items-start gap-3 z-30 pointer-events-none">
            {/* Track Info Banner */}
            <div className="bg-slate-950/75 backdrop-blur-md px-5 py-3 rounded-2xl border border-cyan-400/30 shadow-lg text-right hidden md:block">
              <div className="text-[10px] font-black text-cyan-400 tracking-[0.25em] uppercase">{selectedSong?.difficulty || 'NORMAL'} // {selectedSong?.bpm || 120} BPM</div>
              <div className="text-base font-black italic text-white truncate max-w-[220px]">{selectedSong?.title}</div>
            </div>

            {/* Player Score Box (DMP2 Metallic/Cyan Frame) */}
            <div className="bg-slate-950/75 backdrop-blur-md px-5 py-3 rounded-2xl border-2 border-slate-400/40 min-w-[175px] shadow-[0_0_20px_rgba(56,189,248,0.18)]">
              <div className="flex items-center justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full overflow-hidden border border-cyan-300"><img src={profile.avatar} className="w-full h-full object-cover" /></div>
                      <div className="text-[10px] text-cyan-300 font-black uppercase tracking-wider">{profile.username}</div>
                  </div>
                  <div className="text-[10px] font-black text-slate-400">{accuracy.toFixed(1)}%</div>
              </div>
              <div className="text-3xl font-black italic text-white tracking-wider">{score.toLocaleString()}</div>
            </div>

            {/* Versus Opponent Card (Only in Versus) */}
            {isVersus && opponent && (
                <div className="bg-slate-950/75 backdrop-blur-md px-5 py-3 rounded-2xl border-2 border-red-500/50 min-w-[165px] text-right shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                    <div className="flex items-center justify-end gap-2 mb-1">
                        <div className={`text-[10px] font-black uppercase tracking-wider ${opponent.isAi ? 'text-red-400' : 'text-green-400'}`}>{opponent.name}</div>
                        <div className="w-6 h-6 rounded-full overflow-hidden border border-white"><img src={opponent.avatar} className="w-full h-full object-cover" /></div>
                    </div>
                    <div className="text-3xl font-black italic text-red-500">{opponent.score.toLocaleString()}</div>
                </div>
            )}

            {/* PAUSE BUTTON */}
            <button 
                onClick={() => { pauseTimeRef.current = performance.now(); setGameState(GameState.PAUSED); }} 
                className="bg-slate-950/75 backdrop-blur-md w-12 h-12 rounded-2xl border border-slate-400/40 flex items-center justify-center hover:bg-white/20 pointer-events-auto transition-transform active:scale-95 shadow-xl"
                title="Pause"
            >
                <span className="text-lg">⏸️</span>
            </button>
          </div>

          {/* PET RENDER */}
          {assets.pet && (
              <div className="absolute bottom-24 right-0 left-0 sm:left-[40%] z-20 pointer-events-none h-20 overflow-hidden">
                 <img 
                    src={assets.pet} 
                    className="absolute top-0 w-20 h-20 object-contain drop-shadow-[0_0_20px_rgba(52,211,153,0.5)] animate-pet-run" 
                 />
              </div>
          )}

          {/* MANUAL FEVER BUTTON */}
          {feverReady && !profile.settings.autoFever && (
             <button
                 onClick={activateFever}
                 className="absolute right-6 bottom-24 z-40 bg-gradient-to-br from-orange-500 via-amber-500 to-red-600 text-white font-black italic text-xl px-7 py-4 rounded-2xl border-2 border-yellow-300 shadow-[0_0_30px_rgba(251,191,36,0.6)] animate-pulse active:scale-95 flex flex-col items-center justify-center hover:scale-105 transition-all pointer-events-auto"
             >
                 <span className="drop-shadow-lg tracking-wider">FEVER!</span>
                 <span className="text-[10px] bg-black/50 px-3 py-1 rounded-lg mt-1 font-bold tracking-widest border border-white/20 uppercase">{(profile.settings.feverKeybind || ' ') === ' ' ? 'SPACE' : profile.settings.feverKeybind} / BTN {profile.settings.feverGamepadBinding ?? 0}</span>
             </button>
          )}

          {/* Bottom-Right Song Progress & Health Bar (Clear of Left DMP2 Gear) */}
          <div className="absolute bottom-5 right-6 left-6 sm:left-[42%] z-20 flex flex-col items-end gap-2 pointer-events-none">
             {selectedSong && (
                 <div className="w-full max-w-md flex items-center gap-3 bg-slate-950/60 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10">
                    <span className="text-[9px] font-black text-cyan-400">TIME</span>
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-100" style={{ width: `${Math.min(100, ((performance.now() - startTimeRef.current) / 1000 / selectedSong.duration) * 100)}%` }} />
                    </div>
                    <span className="text-[9px] font-black text-slate-400">{Math.max(0, Math.ceil(selectedSong.duration - (performance.now() - startTimeRef.current) / 1000))}s</span>
                 </div>
             )}
            <div className="w-full max-w-md h-3 bg-slate-950/70 rounded-full overflow-hidden border border-slate-500/40 p-0.5 sm:hidden">
                <div className={`h-full rounded-full transition-all duration-300 ${health < 30 ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-emerald-400 to-cyan-400'}`} style={{ width: `${health}%` }} />
            </div>
          </div>
        </>
      )}

      {gameState === GameState.PAUSED && (
        <div className="relative z-[100] h-full flex flex-col items-center justify-center bg-black/80 backdrop-blur-2xl animate-fade-in">
           <div className="text-center mb-16">
              <h2 className="text-8xl font-black italic mb-2 tracking-tighter">PAUSED</h2>
              <div className="text-cyan-400 font-black tracking-[0.5em] uppercase text-sm">Sync Protocol Suspended</div>
           </div>
           <div className="flex flex-col gap-6 w-full max-w-sm">
             <button onClick={resumeGame} className="group relative bg-white text-black py-8 rounded-3xl font-black text-3xl hover:scale-105 transition-all active:scale-95 shadow-lg"><span className="relative z-10">RESUME</span></button>
             <button onClick={retrySong} className="bg-yellow-600/20 hover:bg-yellow-600/40 border border-yellow-500/50 py-6 rounded-3xl font-black text-2xl transition-all active:scale-95 text-yellow-500">RETRY TRACK</button>
             <button onClick={() => setGameState(GameState.SONG_SELECT)} className="bg-red-600/20 hover:bg-red-600/40 border border-red-500/50 py-6 rounded-3xl font-black text-2xl transition-all active:scale-95 text-red-500">EXIT</button>
           </div>
        </div>
      )}

      {gameState === GameState.RESULT && (
        <div className="relative z-[100] h-full flex flex-col items-center justify-center bg-slate-950 p-12 animate-pop-in">
           <h2 className="text-8xl font-black italic text-pink-500 mb-4 tracking-tighter">{isVersus ? (score > (opponent?.score || 0) ? 'VICTORY' : 'DEFEAT') : 'SYNC COMPLETE'}</h2>
           <div className="grid grid-cols-2 gap-10 w-full max-w-3xl mb-16">
              <div className="bg-white/5 p-10 rounded-[3rem] border-2 border-green-500/30 text-center shadow-2xl">
                <div className="text-green-500 text-xs font-black tracking-widest mb-4 uppercase">YOU</div>
                <div className="text-7xl font-black italic text-white">{score.toLocaleString()}</div>
              </div>
              {isVersus && opponent ? (
                  <div className="bg-white/5 p-10 rounded-[3rem] border-2 border-red-500/30 text-center shadow-2xl">
                    <div className="text-red-500 text-xs font-black tracking-widest mb-4 uppercase">{opponent.name}</div>
                    <div className="text-7xl font-black italic text-white">{opponent.score.toLocaleString()}</div>
                  </div>
              ) : (
                  <div className="bg-white/5 p-10 rounded-[3rem] border border-white/10 text-center shadow-2xl">
                    <div className="text-gray-400 text-xs font-black tracking-widest mb-4 uppercase">Overall Precision</div>
                    <div className="text-7xl font-black italic text-cyan-400">{accuracy.toFixed(1)}%</div>
                  </div>
              )}
           </div>
           <div className="flex gap-6 w-full max-w-2xl">
             <button onClick={retrySong} className="flex-1 bg-white/10 text-white py-6 rounded-3xl font-black text-xl hover:bg-white/20 transition-all border border-white/20">RETRY</button>
             <button onClick={handleShare} className="flex-1 bg-blue-600/20 text-blue-400 py-6 rounded-3xl font-black text-xl hover:bg-blue-600/40 transition-all border border-blue-500/50">SHARE</button>
             <button onClick={() => { addCredits(Math.floor(score/100)); setGameState(GameState.SONG_SELECT); }} className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 py-6 rounded-3xl font-black text-xl hover:scale-105 transition-all shadow-[0_0_30px_rgba(236,72,153,0.3)]">CONTINUE</button>
           </div>
        </div>
      )}

      {gameState === GameState.GAME_OVER && (
        <div className="relative z-[100] h-full flex flex-col items-center justify-center bg-red-950/90 backdrop-blur-3xl p-12 animate-shake">
           <h2 className="text-[12rem] font-black italic text-red-500 mb-8 tracking-tighter drop-shadow-[0_0_50px_rgba(239,68,68,0.5)]">FAILED</h2>
           <div className="text-white font-black tracking-[1em] uppercase mb-16 animate-pulse">Sync Critical Failure // Signal Lost</div>
           <div className="flex gap-6 w-full max-w-2xl">
             <button onClick={retrySong} className="flex-1 bg-white text-black py-8 rounded-3xl font-black text-2xl hover:scale-105 transition-all shadow-2xl">RETRY</button>
             <button onClick={handleShare} className="flex-1 bg-black/50 text-white border border-white/20 py-8 rounded-3xl font-black text-2xl hover:bg-black/70 transition-all">SHARE</button>
             <button onClick={() => setGameState(GameState.SONG_SELECT)} className="flex-1 bg-red-600/20 text-red-400 border border-red-500/50 py-8 rounded-3xl font-black text-2xl hover:bg-red-600/40 transition-all">EXIT</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default RhythmGame;
