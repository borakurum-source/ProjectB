import fs from 'fs';

const path = 'src/services/auth.ts';
let code = fs.readFileSync(path, 'utf8');

if (!code.includes('isQuotaExceeded')) {
  code = code.replace(
    "import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';",
    "import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';\n\nlet isQuotaExceeded = false;\nif (typeof window !== 'undefined') {\n  try {\n    const raw = localStorage.getItem('firestore_quota_exceeded');\n    if (raw && (Date.now() - parseInt(raw, 10)) < 18 * 60 * 60 * 1000) {\n      isQuotaExceeded = true;\n    }\n  } catch {}\n}"
  );

  code = code.replace(
    'await setDoc(doc(db, \'users\', id), user);',
    'if (!isQuotaExceeded) { await setDoc(doc(db, \'users\', id), user).catch(() => {}); }'
  );
  
  code = code.replace(
    "const userDoc = await getDoc(doc(db, 'users', user.uid));",
    "if (isQuotaExceeded) return;\n    const userDoc = await getDoc(doc(db, 'users', user.uid));"
  );

  fs.writeFileSync(path, code);
}
