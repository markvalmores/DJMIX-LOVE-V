import { doc, onSnapshot, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { PlayerProfile, GameSettings, GachaItem, GachaType } from '../types';
import { getPlayerProfile as getLocalProfile, DEFAULT_AVATARS, DEFAULT_WALLPAPER } from './playerService';

// Generate or get a device ID for the user
const getDeviceId = () => {
    let id = localStorage.getItem('djmix_device_id');
    if (!id) {
        id = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('djmix_device_id', id);
    }
    return id;
};

export const DEVICE_ID = getDeviceId();
const userDocRef = doc(db, 'users', DEVICE_ID);

export const subscribeToProfile = (callback: (profile: PlayerProfile) => void) => {
    return onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data() as PlayerProfile);
        } else {
            // First time, initialize from local storage or defaults
            const initialProfile = getLocalProfile();
            setDoc(userDocRef, initialProfile);
            callback(initialProfile);
        }
    }, (error) => {
        console.error("Error subscribing to profile:", error);
        // Fallback to local on error
        callback(getLocalProfile());
    });
};

export const updatePlayerProfile = async (updater: (profile: PlayerProfile) => PlayerProfile) => {
    // For immediate UI feedback, update locally and push to DB
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
        const current = docSnap.data() as PlayerProfile;
        const updated = updater(current);
        await setDoc(userDocRef, updated);
        return updated;
    } else {
        const current = getLocalProfile();
        const updated = updater(current);
        await setDoc(userDocRef, updated);
        return updated;
    }
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
        if (type === 'AVATAR') {
            newAvatar = DEFAULT_AVATARS[0];
        }
        return { ...p, equipped: newEquipped, avatar: newAvatar };
    });
};

export const sellItem = (itemId: string) => {
    return updatePlayerProfile(p => {
        const value = 20;
        const itemExists = p.inventory.some(i => i.id === itemId);
        if (!itemExists) return p;
        
        const newInventory = p.inventory.filter(i => i.id !== itemId);
        const newEquipped = { ...p.equipped };
        let wasEquipped = false;
        
        Object.keys(newEquipped).forEach(key => {
            if ((newEquipped as any)[key] === itemId) {
                (newEquipped as any)[key] = null;
                wasEquipped = true;
            }
        });
        
        let newAvatar = p.avatar;
        if (wasEquipped && p.equipped.avatarId === null) {
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

export const addCustomItem = (item: GachaItem) => updatePlayerProfile(p => ({ ...p, inventory: [item, ...p.inventory] }));
export const setAvatar = (url: string) => updatePlayerProfile(p => ({ ...p, avatar: url }));
export const setUsername = (name: string) => updatePlayerProfile(p => ({ ...p, username: name }));
export const addCredits = (amount: number) => updatePlayerProfile(p => ({ ...p, credits: p.credits + amount }));
export const setKeybinds = (binds: string[]) => updatePlayerProfile(p => ({ ...p, keybinds: binds }));
export { DEFAULT_AVATARS, DEFAULT_WALLPAPER, getPlayerProfile } from './playerService';
