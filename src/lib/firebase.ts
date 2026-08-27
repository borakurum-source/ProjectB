import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, disableNetwork } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Authentication & Firestore with databaseId if specified
export const auth = getAuth(app);
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Check if quota was previously flagged as exceeded within the last 18 hours
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem('firestore_quota_exceeded');
    if (raw) {
      const diff = Date.now() - parseInt(raw, 10);
      if (diff < 18 * 60 * 60 * 1000) {
        disableNetwork(db).catch(() => {});
      }
    }
  } catch {}
}

// Test server connection on boot
export async function testConnection() {
  if (typeof window !== 'undefined' && localStorage.getItem('firestore_quota_exceeded')) {
    const diff = Date.now() - parseInt(localStorage.getItem('firestore_quota_exceeded') || '0', 10);
    if (diff < 18 * 60 * 60 * 1000) return;
  }
  try {
    await getDocFromServer(doc(db, '_connection_test', 'ping'));
  } catch (error: any) {
    const msg = error?.message || String(error);
    if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota limit') || error?.code === 'resource-exhausted') {
      try {
        if (typeof window !== 'undefined') localStorage.setItem('firestore_quota_exceeded', Date.now().toString());
      } catch {}
      disableNetwork(db).catch(() => {});
    } else if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// Helper function to ensure user is authenticated anonymously for ownerId assignment
let authPromise: Promise<User> | null = null;

export async function ensureAuthUser(): Promise<User> {
  if (auth.currentUser) {
    return auth.currentUser;
  }

  if (authPromise) {
    return authPromise;
  }

  authPromise = (async () => {
    try {
      if (auth.currentUser) return auth.currentUser;
      const cred = await signInAnonymously(auth);
      return cred.user;
    } catch (err: any) {
      if (auth.currentUser) return auth.currentUser;
      // If internal assertion or network glitch occurred, return null or fallback user if possible
      console.warn('ensureAuthUser notice:', err?.message || err);
      throw err;
    } finally {
      authPromise = null;
    }
  })();

  return authPromise;
}

