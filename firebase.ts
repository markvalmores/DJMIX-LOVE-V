import { initializeApp } from 'firebase/app';
import { getFirestore, enableMultiTabIndexedDbPersistence, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "gen-lang-client-0288214511",
  appId: "1:846692410980:web:09ec50542c4b9b29fae171",
  apiKey: "AIzaSyDkcNgl0WJk4_-pnCrSDfmDTJ7ymjFZIBA",
  authDomain: "gen-lang-client-0288214511.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-djmixlovev-a9136561-c629-4ac4-87c8-fadcf2abc3b4",
  storageBucket: "gen-lang-client-0288214511.firebasestorage.app",
  messagingSenderId: "846692410980"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with offline persistence
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, firebaseConfig.firestoreDatabaseId);

export { app, db };
