import fs from 'fs';

const path = 'src/lib/firestoreAdapter.ts';
let code = fs.readFileSync(path, 'utf8');

if (!code.includes('isQuotaExceeded')) {
  code = code.replace(
    'export class FirestoreAdapter {',
    `
let isQuotaExceeded = false;
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem('firestore_quota_exceeded');
    if (raw && (Date.now() - parseInt(raw, 10)) < 18 * 60 * 60 * 1000) {
      isQuotaExceeded = true;
    }
  } catch {}
}

export class FirestoreAdapter {`
  );

  code = code.replace(
    'async save<T extends { id: string }>(collectionName: string, id: string, data: T): Promise<void> {',
    `async save<T extends { id: string }>(collectionName: string, id: string, data: T): Promise<void> {
    if (isQuotaExceeded) return;`
  );
  
  code = code.replace(
    'async saveAll<T extends { id: string }>(collectionName: string, items: T[]): Promise<void> {',
    `async saveAll<T extends { id: string }>(collectionName: string, items: T[]): Promise<void> {
    if (isQuotaExceeded || items.length === 0) return;`
  );

  code = code.replace(
    'async get<T>(collectionName: string, id: string): Promise<T | null> {',
    `async get<T>(collectionName: string, id: string): Promise<T | null> {
    if (isQuotaExceeded) return null;`
  );

  code = code.replace(
    'async list<T>(collectionName: string): Promise<T[]> {',
    `async list<T>(collectionName: string): Promise<T[]> {
    if (isQuotaExceeded) return [];`
  );

  code = code.replace(
    'async remove(collectionName: string, id: string): Promise<void> {',
    `async remove(collectionName: string, id: string): Promise<void> {
    if (isQuotaExceeded) return;`
  );

  code = code.replace(
    /disableNetwork\(db\).catch\(\(\) => \{\}\);/g,
    `isQuotaExceeded = true;
    try { if (typeof window !== 'undefined') localStorage.setItem('firestore_quota_exceeded', Date.now().toString()); } catch {}
    disableNetwork(db).catch(() => {});`
  );

  fs.writeFileSync(path, code);
}
