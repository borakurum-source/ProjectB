import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, writeBatch, disableNetwork } from 'firebase/firestore';
import { db, auth, ensureAuthUser } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errMsg = error instanceof Error ? error.message : String(error);
  if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('Quota limit') || (error as any)?.code === 'resource-exhausted') {
    isQuotaExceeded = true;
    try { if (typeof window !== 'undefined') localStorage.setItem('firestore_quota_exceeded', Date.now().toString()); } catch {}
    disableNetwork(db).catch(() => {});
    console.warn(`[Firestore Quota Notice] Handled ${operationType} gracefully via offline/local store due to daily write quota limit.`);
    return;
  }
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}


let isQuotaExceeded = false;
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem('firestore_quota_exceeded');
    if (raw && (Date.now() - parseInt(raw, 10)) < 18 * 60 * 60 * 1000) {
      isQuotaExceeded = true;
    }
  } catch {}
}

export class FirestoreAdapter {
  private async ensureAuth() {
    try {
      await ensureAuthUser();
    } catch (err) {
      console.warn('Auth user initialization warning:', err);
    }
  }

  async save<T extends { id: string }>(collectionName: string, id: string, data: T): Promise<void> {
    if (isQuotaExceeded) return;
    await this.ensureAuth();
    const docPath = `${collectionName}/${id}`;
    try {
      const docRef = doc(db, collectionName, id);
      // Ensure null/undefined fields are handled cleanly
      const payload = JSON.parse(JSON.stringify(data));
      await setDoc(docRef, payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
    }
  }

  async load<T>(collectionName: string, id: string): Promise<T | null> {
    await this.ensureAuth();
    const docPath = `${collectionName}/${id}`;
    try {
      const docRef = doc(db, collectionName, id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as T;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, docPath);
    }
  }

  async list<T>(collectionName: string): Promise<T[]> {
    if (isQuotaExceeded) return [];
    await this.ensureAuth();
    try {
      const colRef = collection(db, collectionName);
      const snap = await getDocs(colRef);
      const results: T[] = [];
      snap.forEach((d) => {
        results.push(d.data() as T);
      });
      return results;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, collectionName);
    }
  }

  async delete(collectionName: string, id: string): Promise<void> {
    await this.ensureAuth();
    const docPath = `${collectionName}/${id}`;
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  }

  async saveAll<T extends { id: string }>(collectionName: string, items: T[]): Promise<void> {
    if (isQuotaExceeded || items.length === 0) return;
    await this.ensureAuth();
    if (items.length === 0) return;

    // Firestore batch supports up to 500 writes
    const CHUNK_SIZE = 400;
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      const chunk = items.slice(i, i + CHUNK_SIZE);
      try {
        const batch = writeBatch(db);
        chunk.forEach((item) => {
          const docRef = doc(db, collectionName, item.id);
          const payload = JSON.parse(JSON.stringify(item));
          batch.set(docRef, payload, { merge: true });
        });
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, collectionName);
      }
    }
  }
}
