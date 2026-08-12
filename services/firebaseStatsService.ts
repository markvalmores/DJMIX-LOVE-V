import { doc, onSnapshot, setDoc, getDoc, increment, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const statsRef = doc(db, 'system', 'globalStats');

export const subscribeToStats = (callback: (stats: { activePlayers: number, totalGamers: number }) => void) => {
    return onSnapshot(statsRef, (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data() as { activePlayers: number, totalGamers: number });
        } else {
            const initialStats = { activePlayers: 1402, totalGamers: 50349 };
            setDoc(statsRef, initialStats);
            callback(initialStats);
        }
    });
};

// Simulate joining the game
export const recordPlayerJoin = async () => {
    const docSnap = await getDoc(statsRef);
    if (!docSnap.exists()) {
        await setDoc(statsRef, { activePlayers: 1403, totalGamers: 50350 });
    } else {
        await updateDoc(statsRef, {
            totalGamers: increment(1),
            activePlayers: increment(1)
        });
    }
};

// Periodic keep-alive or simulation (since we don't have RTDB onDisconnect)
export const simulateActivePlayers = async () => {
    const docSnap = await getDoc(statsRef);
    if (docSnap.exists()) {
        const change = Math.floor(Math.random() * 5) - 2; // -2 to +2
        await updateDoc(statsRef, {
            activePlayers: increment(change)
        });
    }
};
