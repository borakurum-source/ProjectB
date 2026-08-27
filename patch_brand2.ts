import fs from 'fs';

const path = 'src/components/tabs/BrandMemoryTab.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  'Gemini gemini-embedding-2',
  'Gemini Embedding 2'
);

code = code.replace(
  'Verified by gemini-embedding-2',
  'Verified by Gemini Embedding 2'
);

fs.writeFileSync(path, code);
