import fs from 'fs';

const path = 'src/components/tabs/BrandMemoryTab.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /text-embedding-004/g,
  "gemini-embedding-2"
);

fs.writeFileSync(path, code);
