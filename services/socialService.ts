
import { Friend } from "../types";

const FRIENDS_KEY = 'djmix_friends_list';

const MOCK_USERS: Friend[] = [
    { id: 'u1', username: 'Neon_Valkyrie', avatar: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=200', status: 'ONLINE', isFollowing: true, lastSeen: 'Now' },
    { id: 'u2', username: 'Bass_Drop_99', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200', status: 'IN_GAME', isFollowing: false, lastSeen: 'Now' },
    { id: 'u3', username: 'Glitch_Mod', avatar: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?auto=format&fit=crop&q=80&w=200', status: 'OFFLINE', isFollowing: true, lastSeen: '2h ago' },
    { id: 'u4', username: 'Rhythm_Sage', avatar: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&q=80&w=200', status: 'ONLINE', isFollowing: false, lastSeen: 'Now' },
];

export const getFriends = (): Friend[] => {
    try {
        const stored = localStorage.getItem(FRIENDS_KEY);
        if (stored) return JSON.parse(stored);
        return MOCK_USERS;
    } catch (e) {
        return MOCK_USERS;
    }
};

export const addFriend = (friendId: string) => {
    const friends = getFriends();
    const updated = friends.map(f => f.id === friendId ? { ...f, isFollowing: true } : f);
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(updated));
    return updated;
};

export const removeFriend = (friendId: string) => {
    const friends = getFriends();
    const updated = friends.map(f => f.id === friendId ? { ...f, isFollowing: false } : f);
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(updated));
    return updated;
};

export const toggleFollow = (friendId: string) => {
    const friends = getFriends();
    const friend = friends.find(f => f.id === friendId);
    if (friend?.isFollowing) return removeFriend(friendId);
    return addFriend(friendId);
};

export const getOnlineFriends = () => {
    return getFriends().filter(f => f.status === 'ONLINE' || f.status === 'IN_GAME');
};
